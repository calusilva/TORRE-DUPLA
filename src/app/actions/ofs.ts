"use server";

import { and, count, eq, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { chapaEventos, chapas, etiquetasImpressas, naoConformidades, obras, ordensFabrico } from "@/db/schema";
import type { EstadoOF } from "@/lib/dominio";
import { gerarLoteChapas } from "@/lib/servicos/lote-chapas";
import { exigirPerfil } from "@/lib/sessao";
import { errosPorCampo, loteChapasSchema, ofSchema, type ResultadoAccao } from "@/lib/validacao";

const GESTAO = ["admin", "encarregado"] as const;

function revalidarOF(ofId?: string, obraId?: string) {
  revalidatePath("/of");
  revalidatePath("/obras");
  if (ofId) revalidatePath(`/of/${ofId}`);
  if (obraId) revalidatePath(`/obras/${obraId}`);
}

/** Cria a OF e, se pedido, gera o primeiro lote de chapas — tudo numa transacção. */
export async function criarOF(_prev: unknown, formData: FormData): Promise<ResultadoAccao<{ id: string; numero: string }>> {
  const user = await exigirPerfil([...GESTAO]);
  const raw = Object.fromEntries(formData);
  const parsedOf = ofSchema.safeParse(raw);
  const gerar = raw.gerarChapas === "on";
  const parsedLote = gerar
    ? loteChapasSchema.safeParse({ zona: raw.loteZona, materialId: raw.materialId, larguras: raw.larguras, alturas: raw.alturas, pisoBase: raw.pisoBase })
    : null;

  const campos = {
    ...(parsedOf.success ? {} : errosPorCampo(parsedOf.error)),
    ...(parsedLote && !parsedLote.success ? prefixar(errosPorCampo(parsedLote.error)) : {}),
  };
  if (!parsedOf.success || (parsedLote && !parsedLote.success)) {
    return { ok: false, erro: "Verifique os campos assinalados.", campos };
  }
  const d = parsedOf.data;

  try {
    const resultado = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('numero_of'))`);
      const ano = new Date().getFullYear();
      // Numeração global e contínua (não reinicia no ano), como na Torre Dupla.
      const [{ maxN }] = await tx
        .select({ maxN: sql<number>`coalesce(max(split_part(${ordensFabrico.numero}, '-', 3)::int), 0)::int` })
        .from(ordensFabrico);
      const numero = `OF-${ano}-${String(maxN + 1).padStart(4, "0")}`;

      const [of] = await tx
        .insert(ordensFabrico)
        .values({
          numero,
          obraId: d.obraId,
          descricao: d.descricao,
          zona: d.zona ?? parsedLote?.data?.zona ?? null,
          totalChapas: 0,
          prioridade: d.prioridade,
          dataFechoPrevisto: d.dataFechoPrevisto ?? null,
          operadorResponsavelId: d.operadorResponsavelId ?? null,
        })
        .returning({ id: ordensFabrico.id, numero: ordensFabrico.numero });

      const lote = parsedLote?.data
        ? await gerarLoteChapas(tx, { ofId: of.id, lote: parsedLote.data, utilizadorId: user.id })
        : null;
      return { of, lote };
    });

    revalidarOF(resultado.of.id, d.obraId);
    const extra = resultado.lote ? ` com ${resultado.lote.quantidade} chapas` : "";
    return { ok: true, mensagem: `${resultado.of.numero} criada${extra}`, dados: resultado.of };
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível criar a OF." };
  }
}

export async function actualizarOF(id: string, _prev: unknown, formData: FormData): Promise<ResultadoAccao<{ id: string; numero: string }>> {
  await exigirPerfil([...GESTAO]);
  const parsed = ofSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, erro: "Verifique os campos assinalados.", campos: errosPorCampo(parsed.error) };
  const d = parsed.data;

  const [of] = await db
    .update(ordensFabrico)
    .set({
      descricao: d.descricao,
      zona: d.zona ?? null,
      prioridade: d.prioridade,
      dataFechoPrevisto: d.dataFechoPrevisto ?? null,
      operadorResponsavelId: d.operadorResponsavelId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(ordensFabrico.id, id))
    .returning({ id: ordensFabrico.id, numero: ordensFabrico.numero, obraId: ordensFabrico.obraId });
  if (!of) return { ok: false, erro: "OF não encontrada." };

  revalidarOF(of.id, of.obraId);
  return { ok: true, mensagem: `${of.numero} actualizada`, dados: of };
}

/** Acrescenta um lote de chapas (nova zona ou extensão) a uma OF existente. */
export async function adicionarLoteChapas(ofId: string, _prev: unknown, formData: FormData): Promise<ResultadoAccao<{ quantidade: number }>> {
  const user = await exigirPerfil([...GESTAO]);
  const raw = Object.fromEntries(formData);
  const parsed = loteChapasSchema.safeParse({ zona: raw.loteZona, materialId: raw.materialId, larguras: raw.larguras, alturas: raw.alturas, pisoBase: raw.pisoBase });
  if (!parsed.success) return { ok: false, erro: "Verifique os campos assinalados.", campos: prefixar(errosPorCampo(parsed.error)) };

  const [of] = await db.select().from(ordensFabrico).where(eq(ordensFabrico.id, ofId));
  if (!of) return { ok: false, erro: "OF não encontrada." };
  if (of.estado === "concluida" || of.estado === "cancelada") {
    return { ok: false, erro: "Não é possível acrescentar chapas a uma OF concluída ou cancelada." };
  }

  try {
    const lote = await db.transaction((tx) => gerarLoteChapas(tx, { ofId, lote: parsed.data, utilizadorId: user.id }));
    revalidarOF(ofId, of.obraId);
    return {
      ok: true,
      mensagem: `${lote.quantidade} chapas geradas (${lote.primeiro} → ${lote.ultimo})`,
      dados: { quantidade: lote.quantidade },
    };
  } catch (e) {
    console.error(e);
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível gerar as chapas." };
  }
}

const TRANSICOES_OF: Record<EstadoOF, EstadoOF[]> = {
  em_espera: ["em_producao", "cancelada"],
  em_producao: ["suspensa", "concluida"],
  suspensa: ["em_producao", "cancelada"],
  concluida: [],
  cancelada: [],
};

export async function mudarEstadoOF(id: string, novo: EstadoOF): Promise<ResultadoAccao> {
  await exigirPerfil([...GESTAO]);
  const [of] = await db.select().from(ordensFabrico).where(eq(ordensFabrico.id, id));
  if (!of) return { ok: false, erro: "OF não encontrada." };
  if (!TRANSICOES_OF[of.estado].includes(novo)) {
    return { ok: false, erro: `Transição inválida: ${of.estado} → ${novo}` };
  }

  if (novo === "concluida") {
    const [{ pendentes }] = await db
      .select({ pendentes: count() })
      .from(chapas)
      .where(and(eq(chapas.ofId, id), inArray(chapas.estado, ["por_produzir", "em_producao", "rejeitada_qc", "em_retrabalho"])));
    if (pendentes > 0) return { ok: false, erro: `Ainda há ${pendentes} chapa(s) por concluir nesta OF.` };
  }
  if (novo === "cancelada") {
    const [{ iniciadas }] = await db
      .select({ iniciadas: count() })
      .from(chapas)
      .where(and(eq(chapas.ofId, id), ne(chapas.estado, "por_produzir")));
    if (iniciadas > 0) return { ok: false, erro: `Não é possível cancelar: ${iniciadas} chapa(s) já entraram em produção.` };
  }

  await db
    .update(ordensFabrico)
    .set({ estado: novo, updatedAt: new Date(), ...(novo === "concluida" && { dataFechoReal: new Date() }) })
    .where(eq(ordensFabrico.id, id));

  // Ao arrancar a primeira OF de uma obra em planeamento, a obra passa a "em produção".
  if (novo === "em_producao") {
    await db.update(obras).set({ estado: "em_producao", updatedAt: new Date() }).where(and(eq(obras.id, of.obraId), eq(obras.estado, "planeamento")));
  }

  revalidarOF(id, of.obraId);
  const labels: Record<EstadoOF, string> = { em_espera: "em espera", em_producao: "em produção", suspensa: "suspensa", concluida: "concluída", cancelada: "cancelada" };
  return { ok: true, mensagem: `${of.numero} ${novo === "em_producao" && of.estado === "suspensa" ? "retomada" : labels[novo]}` };
}

/** Elimina uma OF que ainda não tenha nenhuma chapa iniciada. */
export async function eliminarOF(id: string): Promise<ResultadoAccao> {
  await exigirPerfil([...GESTAO]);
  const [of] = await db.select().from(ordensFabrico).where(eq(ordensFabrico.id, id));
  if (!of) return { ok: false, erro: "OF não encontrada." };

  const [{ iniciadas }] = await db
    .select({ iniciadas: count() })
    .from(chapas)
    .where(and(eq(chapas.ofId, id), ne(chapas.estado, "por_produzir")));
  if (iniciadas > 0) return { ok: false, erro: "Só é possível eliminar OFs sem chapas em produção. Use \"Cancelar\"." };

  await db.transaction(async (tx) => {
    const ids = tx.select({ id: chapas.id }).from(chapas).where(eq(chapas.ofId, id));
    await tx.delete(etiquetasImpressas).where(inArray(etiquetasImpressas.chapaId, ids));
    await tx.delete(chapaEventos).where(inArray(chapaEventos.chapaId, ids));
    await tx.delete(naoConformidades).where(eq(naoConformidades.ofId, id));
    await tx.delete(chapas).where(eq(chapas.ofId, id));
    await tx.delete(ordensFabrico).where(eq(ordensFabrico.id, id));
  });

  revalidarOF(undefined, of.obraId);
  return { ok: true, mensagem: `${of.numero} eliminada` };
}

/** Os campos do lote vêm prefixados no formulário para não colidirem com os da OF. */
function prefixar(campos: Record<string, string>) {
  return Object.fromEntries(Object.entries(campos).map(([k, v]) => [k === "zona" ? "loteZona" : k, v]));
}
