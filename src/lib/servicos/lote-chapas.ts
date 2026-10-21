import "server-only";
import { eq, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { chapaEventos, chapas, obras, ordensFabrico } from "@/db/schema";
import { calcularM2, gerarCodigoChapa, gerarPayloadQR, sufixoOf } from "@/lib/codigos";
import { AFASTAMENTO_LOTE_PX, planearGrelha } from "@/lib/fachada";
import { materialPorId } from "@/lib/materiais";
import type { LoteChapas } from "@/lib/validacao";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

/**
 * Gera um lote de chapas para uma OF: códigos sequenciais, payload QR,
 * posições X/Y no layout visual e evento de criação. Corre dentro da transacção recebida.
 *
 * Se a zona já tiver chapas nesta obra, o novo lote é colocado à direita do existente
 * e as colunas continuam a numeração (ex.: K, L, …).
 */
export async function gerarLoteChapas(
  tx: Tx,
  params: { ofId: string; lote: LoteChapas; utilizadorId: string; agora?: Date },
) {
  const agora = params.agora ?? new Date();
  const { lote } = params;
  const material = materialPorId(lote.materialId)!;

  const [of] = await tx
    .select({ id: ordensFabrico.id, numero: ordensFabrico.numero, obraId: obras.id, codigoObra: obras.codigo, cliente: obras.cliente })
    .from(ordensFabrico)
    .innerJoin(obras, eq(obras.id, ordensFabrico.obraId))
    .where(eq(ordensFabrico.id, params.ofId))
    .for("update", { of: ordensFabrico });
  if (!of) throw new Error("OF não encontrada");

  // Próxima sequência dentro da OF (os 4 últimos dígitos do código).
  const [{ maxSeq }] = await tx
    .select({ maxSeq: sql<number>`coalesce(max(right(${chapas.codigo}, 4)::int), 0)::int` })
    .from(chapas)
    .where(eq(chapas.ofId, of.id));

  // Ocupação actual da zona nesta obra, para não sobrepor lotes no layout.
  const [ocupacao] = await tx
    .select({
      maxX: sql<number | null>`max(${chapas.posicaoX} + ${chapas.largura} * 0.1)::float`,
      nColunas: sql<number>`count(distinct ${chapas.coluna})::int`,
    })
    .from(chapas)
    .where(sql`${chapas.obraId} = ${of.obraId} and ${chapas.zona} = ${lote.zona}`);

  const plano = planearGrelha(
    { zona: lote.zona, larguras: lote.larguras, alturas: lote.alturas, pisoBase: lote.pisoBase },
    {
      seqInicial: maxSeq + 1,
      offsetX: ocupacao?.maxX != null ? ocupacao.maxX + AFASTAMENTO_LOTE_PX : 0,
      colunaInicial: ocupacao?.nColunas ?? 0,
    },
  );
  if (maxSeq + plano.length > 9999) throw new Error("Limite de 9999 chapas por OF excedido");

  const novas = plano.map((p) => {
    const codigo = gerarCodigoChapa({
      ano: agora.getFullYear(),
      mes: agora.getMonth() + 1,
      numeroOf: sufixoOf(of.numero),
      sequencia: p.seq,
    });
    const m2 = calcularM2(p.largura, p.altura);
    return {
      id: crypto.randomUUID(),
      codigo,
      qrCodeData: gerarPayloadQR({
        codigo,
        numeroOf: of.numero,
        codigoObra: of.codigoObra,
        cliente: of.cliente,
        zona: p.zona,
        largura: p.largura,
        altura: p.altura,
        material: material.nome,
      }),
      ofId: of.id,
      obraId: of.obraId,
      largura: String(p.largura),
      altura: String(p.altura),
      espessura: String(material.espessura),
      m2: m2.toFixed(4),
      peso: (m2 * material.kgM2).toFixed(2),
      material: material.nome,
      cor: material.cor,
      acabamento: material.acabamento,
      zona: p.zona,
      piso: p.piso,
      coluna: p.coluna,
      linha: p.linha,
      posicaoX: p.posicaoX.toFixed(2),
      posicaoY: p.posicaoY.toFixed(2),
      estado: "por_produzir" as const,
      createdAt: agora,
      updatedAt: agora,
    };
  });

  for (let i = 0; i < novas.length; i += 500) {
    const bloco = novas.slice(i, i + 500);
    await tx.insert(chapas).values(bloco);
    await tx.insert(chapaEventos).values(
      bloco.map((c) => ({
        chapaId: c.id,
        tipo: "criacao",
        descricao: `Chapa criada a partir da ${of.numero} (${lote.zona})`,
        estadoNovo: "por_produzir",
        utilizadorId: params.utilizadorId,
        timestamp: agora,
      })),
    );
  }

  await tx
    .update(ordensFabrico)
    .set({ totalChapas: sql`${ordensFabrico.totalChapas} + ${novas.length}`, updatedAt: agora })
    .where(eq(ordensFabrico.id, of.id));

  return {
    quantidade: novas.length,
    primeiro: novas[0]?.codigo,
    ultimo: novas.at(-1)?.codigo,
    m2: novas.reduce((s, c) => s + Number(c.m2), 0),
  };
}
