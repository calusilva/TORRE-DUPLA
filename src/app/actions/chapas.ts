"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { chapaEventos, chapas, naoConformidades, obras, ordensFabrico } from "@/db/schema";
import { extrairCodigoChapa } from "@/lib/codigos";
import {
  accaoTransicao,
  ESTADOS_CHAPA,
  ESTADOS_PRODUZIDOS,
  LABEL_ESTADO_CHAPA,
  PERMISSOES_ESTADO,
  SEVERIDADES_NC,
  TIPOS_NC,
  TRANSICOES_VALIDAS,
  type EstadoChapa,
} from "@/lib/dominio";
import { obterChapaScan, type ChapaScan } from "@/lib/queries";
import { guardarFoto } from "@/lib/servicos/fotos";
import { exigirSessao } from "@/lib/sessao";

type Resultado = { ok: true; chapa: NonNullable<ChapaScan>; mensagem?: string } | { ok: false; erro: string };

/** Lê uma chapa a partir de qualquer formato de leitura (QR JSON, URL, Code 128, manual). */
export async function lerChapa(leitura: string): Promise<Resultado> {
  await exigirSessao();
  const codigo = extrairCodigoChapa(leitura);
  // Atalho de introdução manual: "89-44" ou "0089-0044" (OF-sequência).
  const curto = /^\s*(\d{1,4})-(\d{1,4})\s*$/.exec(leitura);
  if (!codigo && curto) {
    const sufixo = `-${curto[1].padStart(4, "0")}-${curto[2].padStart(4, "0")}`;
    const [c] = await db.select({ codigo: chapas.codigo }).from(chapas).where(sql`${chapas.codigo} like ${"TD-____" + sufixo}`).limit(1);
    if (c) return lerChapa(c.codigo);
  }
  if (!codigo) return { ok: false, erro: `Código não reconhecido: "${leitura.slice(0, 40)}"` };
  const chapa = await obterChapaScan({ codigo });
  if (!chapa) return { ok: false, erro: `Chapa ${codigo} não encontrada.` };
  return { ok: true, chapa };
}

const ncSchema = z.object({
  tipo: z.enum(TIPOS_NC, "Seleccione o tipo de não conformidade"),
  severidade: z.enum(SEVERIDADES_NC, "Seleccione a severidade"),
  descricao: z.string().trim().min(5, "Descreva o problema (mín. 5 caracteres)").max(1000),
  fotoBase64: z.string().max(8_000_000).optional(),
});
export type DadosNC = z.input<typeof ncSchema>;

const transicaoSchema = z.object({
  chapaId: z.uuid(),
  novoEstado: z.enum(ESTADOS_CHAPA),
  /** Estado que o utilizador estava a ver — evita aplicar acções sobre dados desactualizados. */
  estadoEsperado: z.enum(ESTADOS_CHAPA).optional(),
  observacao: z.string().trim().max(1000).optional(),
  nc: ncSchema.optional(),
  gps: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
});

/**
 * Núcleo do chão de fábrica: aplica uma transição de estado a uma chapa.
 * Valida máquina de estados e perfil, actualiza datas/operadores, regista o evento,
 * gere não conformidades e recalcula o contador da OF — tudo numa transacção.
 */
export async function transicionarChapa(input: z.input<typeof transicaoSchema>): Promise<Resultado> {
  const user = await exigirSessao();
  const parsed = transicaoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Pedido inválido" };
  const { chapaId, novoEstado, estadoEsperado, observacao, nc, gps } = parsed.data;

  if (!PERMISSOES_ESTADO[user.perfil].includes(novoEstado)) {
    return { ok: false, erro: `O seu perfil não permite marcar chapas como "${LABEL_ESTADO_CHAPA[novoEstado]}".` };
  }
  if (novoEstado === "rejeitada_qc" && !nc) {
    return { ok: false, erro: "A reprovação em QC exige o registo da não conformidade." };
  }

  // Upload da foto fora da transacção (I/O de disco).
  let fotoUrl: string | null = null;
  if (nc?.fotoBase64) {
    try {
      fotoUrl = await guardarFoto(nc.fotoBase64);
    } catch (e) {
      return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível guardar a foto." };
    }
  }

  try {
    const r = await db.transaction(async (tx) => {
      const [c] = await tx.select().from(chapas).where(eq(chapas.id, chapaId)).for("update");
      if (!c) return { erro: "Chapa não encontrada." };
      const de = c.estado;
      if (estadoEsperado && estadoEsperado !== de) {
        return { erro: `A chapa foi actualizada entretanto — está agora "${LABEL_ESTADO_CHAPA[de]}".` };
      }
      if (!TRANSICOES_VALIDAS[de].includes(novoEstado)) {
        return { erro: `Transição inválida: ${LABEL_ESTADO_CHAPA[de]} → ${LABEL_ESTADO_CHAPA[novoEstado]}.` };
      }

      const [of] = await tx.select({ estado: ordensFabrico.estado, obraId: ordensFabrico.obraId }).from(ordensFabrico).where(eq(ordensFabrico.id, c.ofId));
      if (of.estado === "cancelada" || of.estado === "concluida") {
        return { erro: `A OF está ${of.estado === "cancelada" ? "cancelada" : "concluída"}.` };
      }

      const agora = new Date();
      const accao = accaoTransicao(de, novoEstado)!;
      const update: Partial<typeof chapas.$inferInsert> = { estado: novoEstado, updatedAt: agora };
      let descricao = observacao || accao.label;
      const metadados: Record<string, unknown> = {};

      switch (`${de}>${novoEstado}`) {
        case "por_produzir>em_producao":
          update.dataInicioProd = agora;
          update.operadorProducaoId = user.id;
          descricao = observacao || "Produção iniciada";
          break;
        case "em_producao>produzida": {
          update.dataFimProd = agora;
          const min = c.dataInicioProd ? Math.round((agora.getTime() - c.dataInicioProd.getTime()) / 60_000) : null;
          if (min !== null) metadados.duracaoMin = min;
          descricao = observacao || "Produção concluída";
          break;
        }
        case "em_producao>por_produzir":
          update.dataInicioProd = null;
          update.operadorProducaoId = null;
          descricao = observacao || "Produção suspensa — chapa devolvida à fila";
          break;
        case "produzida>aprovada_qc":
          update.dataQC = agora;
          update.operadorQcId = user.id;
          descricao = observacao || "Conforme.";
          // Uma aprovação após retrabalho fecha as não conformidades em aberto.
          await tx
            .update(naoConformidades)
            .set({ estado: "resolvida", resolvidaPorId: user.id, dataResolucao: agora })
            .where(and(eq(naoConformidades.chapaId, c.id), inArray(naoConformidades.estado, ["aberta", "em_resolucao"])));
          break;
        case "produzida>rejeitada_qc":
          update.dataQC = agora;
          update.operadorQcId = user.id;
          update.temNaoConformidade = true;
          descricao = nc!.descricao;
          break;
        case "rejeitada_qc>em_retrabalho":
          await tx
            .update(naoConformidades)
            .set({ estado: "em_resolucao", acao: "retrabalho" })
            .where(and(eq(naoConformidades.chapaId, c.id), eq(naoConformidades.estado, "aberta")));
          break;
        case "aprovada_qc>expedida":
          update.dataExpedicao = agora;
          break;
        case "expedida>instalada":
          update.dataInstalacao = agora;
          descricao = observacao || "Instalação confirmada em obra";
          break;
      }

      if (nc) {
        await tx.insert(naoConformidades).values({
          chapaId: c.id,
          ofId: c.ofId,
          tipo: nc.tipo,
          severidade: nc.severidade,
          descricao: nc.descricao,
          reportadoPorId: user.id,
          dataReporte: agora,
          fotoUrl,
          estado: "aberta",
        });
      }

      await tx.update(chapas).set(update).where(eq(chapas.id, c.id));
      await tx.insert(chapaEventos).values({
        chapaId: c.id,
        tipo: accao.evento,
        descricao,
        estadoAnterior: de,
        estadoNovo: novoEstado,
        utilizadorId: user.id,
        timestamp: agora,
        fotoUrl,
        latitude: gps ? gps.lat.toFixed(8) : null,
        longitude: gps ? gps.lng.toFixed(8) : null,
        metadados: Object.keys(metadados).length ? metadados : null,
      });

      // Contador da OF a partir do estado real das chapas.
      await tx
        .update(ordensFabrico)
        .set({
          chapasProduzidasCount: sql`(select count(*)::int from ${chapas} where ${chapas.ofId} = ${c.ofId} and ${chapas.estado} in (${sql.join(ESTADOS_PRODUZIDOS.map((e) => sql`${e}`), sql`, `)}))`,
          updatedAt: agora,
          // A primeira chapa iniciada põe a OF (e a obra) em produção.
          ...(novoEstado === "em_producao" && of.estado === "em_espera" && { estado: "em_producao" as const }),
        })
        .where(eq(ordensFabrico.id, c.ofId));
      if (novoEstado === "em_producao") {
        await tx.update(obras).set({ estado: "em_producao", updatedAt: agora }).where(and(eq(obras.id, of.obraId), eq(obras.estado, "planeamento")));
      }

      return { de, label: accao.label, codigo: c.codigo, ofId: c.ofId, obraId: of.obraId };
    });

    if ("erro" in r) return { ok: false, erro: r.erro! };

    revalidatePath(`/of/${r.ofId}`);
    revalidatePath(`/obras/${r.obraId}/layout-visual`);
    const chapa = (await obterChapaScan({ id: chapaId }))!;
    return { ok: true, chapa, mensagem: `${r.codigo}: ${LABEL_ESTADO_CHAPA[r.de as EstadoChapa]} → ${LABEL_ESTADO_CHAPA[novoEstado]}` };
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível actualizar a chapa. Tente novamente." };
  }
}

/** Reporta um problema numa chapa sem mudar o seu estado (ex.: dano detectado em armazém). */
export async function reportarProblema(input: { chapaId: string } & DadosNC): Promise<Resultado> {
  const user = await exigirSessao();
  const parsed = ncSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const nc = parsed.data;

  let fotoUrl: string | null = null;
  if (nc.fotoBase64) {
    try {
      fotoUrl = await guardarFoto(nc.fotoBase64);
    } catch (e) {
      return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível guardar a foto." };
    }
  }

  const [c] = await db.select({ id: chapas.id, ofId: chapas.ofId, estado: chapas.estado }).from(chapas).where(eq(chapas.id, input.chapaId));
  if (!c) return { ok: false, erro: "Chapa não encontrada." };

  const agora = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(naoConformidades).values({ chapaId: c.id, ofId: c.ofId, tipo: nc.tipo, severidade: nc.severidade, descricao: nc.descricao, reportadoPorId: user.id, dataReporte: agora, fotoUrl, estado: "aberta" });
    await tx.update(chapas).set({ temNaoConformidade: true, updatedAt: agora }).where(eq(chapas.id, c.id));
    await tx.insert(chapaEventos).values({ chapaId: c.id, tipo: "observacao", descricao: `Problema reportado: ${nc.descricao}`, estadoAnterior: c.estado, estadoNovo: c.estado, utilizadorId: user.id, timestamp: agora, fotoUrl, metadados: { naoConformidade: nc.tipo, severidade: nc.severidade } });
  });
  revalidatePath(`/of/${c.ofId}`);
  const chapa = (await obterChapaScan({ id: c.id }))!;
  return { ok: true, chapa, mensagem: "Não conformidade registada" };
}
