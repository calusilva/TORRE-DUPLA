import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { materiais, movimentosStock } from "@/db/schema";
import { consumoTeorico, type ChapaParaConsumo, type CodigoMaterial } from "@/lib/consumos";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

/**
 * Movimenta o stock pelo consumo teórico de uma chapa (dentro da transacção recebida).
 * sinal -1 = saída por início de produção; +1 = devolução (produção suspensa).
 */
export async function movimentarConsumoChapa(
  tx: Tx,
  chapa: ChapaParaConsumo & { codigo: string; ofId: string },
  sinal: -1 | 1,
  utilizadorId: string,
) {
  const consumo = consumoTeorico(chapa);
  const codigos = Object.keys(consumo) as CodigoMaterial[];
  if (!codigos.length) return;

  const linhas = await tx.select().from(materiais).where(inArray(materiais.codigo, codigos)).for("update");
  for (const m of linhas) {
    const q = Math.round((consumo[m.codigo as CodigoMaterial] ?? 0) * 100) / 100;
    if (!q) continue;
    const anterior = Number(m.stockAtual);
    const nova = Math.round((anterior + sinal * q) * 100) / 100;
    await tx.update(materiais).set({ stockAtual: nova.toFixed(2), updatedAt: sql`now()` }).where(eq(materiais.id, m.id));
    await tx.insert(movimentosStock).values({
      materialId: m.id,
      tipo: sinal < 0 ? "saida" : "ajuste",
      quantidade: (sinal * q).toFixed(2),
      quantidadeAnterior: anterior.toFixed(2),
      quantidadeNova: nova.toFixed(2),
      motivo: sinal < 0 ? `Início de produção — ${chapa.codigo}` : `Devolução — produção suspensa ${chapa.codigo}`,
      ofId: chapa.ofId,
      utilizadorId,
    });
  }
}
