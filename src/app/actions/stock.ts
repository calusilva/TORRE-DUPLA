"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { materiais, movimentosStock } from "@/db/schema";
import { LABEL_UNIDADE, PERFIS_MOVIMENTO_STOCK } from "@/lib/dominio";
import { exigirSessao } from "@/lib/sessao";

const movimentoSchema = z.object({
  materialId: z.uuid(),
  tipo: z.enum(["entrada", "ajuste"]),
  /** Entrada: quantidade recebida. Ajuste: stock contado no inventário. */
  quantidade: z.coerce.number("Quantidade inválida").min(0, "A quantidade não pode ser negativa").max(9_999_999),
  motivo: z.string().trim().min(3, "Indique o motivo").max(200),
  fornecedor: z.string().trim().max(150).optional(),
});

export type ResultadoMovimento = { ok: true; mensagem: string } | { ok: false; erro: string; campos?: Record<string, string> };

/** Movimento manual de stock (entradas e ajustes de inventário — as saídas vêm da produção). */
export async function registarMovimento(input: z.input<typeof movimentoSchema>): Promise<ResultadoMovimento> {
  const user = await exigirSessao();
  if (!PERFIS_MOVIMENTO_STOCK.includes(user.perfil)) return { ok: false, erro: "Só o encarregado ou o administrador podem registar movimentos." };

  const parsed = movimentoSchema.safeParse(input);
  if (!parsed.success) {
    const campos = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    return { ok: false, erro: "Verifique os campos assinalados.", campos };
  }
  const d = parsed.data;
  if (d.tipo === "entrada" && d.quantidade <= 0) return { ok: false, erro: "A entrada tem de ter quantidade superior a 0.", campos: { quantidade: "Superior a 0" } };

  try {
    const r = await db.transaction(async (tx) => {
      const [m] = await tx.select().from(materiais).where(eq(materiais.id, d.materialId)).for("update");
      if (!m) return null;
      const anterior = Number(m.stockAtual);
      const nova = Math.round((d.tipo === "entrada" ? anterior + d.quantidade : d.quantidade) * 100) / 100;
      const delta = Math.round((nova - anterior) * 100) / 100;

      await tx.update(materiais).set({ stockAtual: nova.toFixed(2), updatedAt: sql`now()`, ...(d.tipo === "entrada" && d.fornecedor && { fornecedor: d.fornecedor }) }).where(eq(materiais.id, m.id));
      await tx.insert(movimentosStock).values({
        materialId: m.id,
        tipo: d.tipo,
        quantidade: delta.toFixed(2),
        quantidadeAnterior: anterior.toFixed(2),
        quantidadeNova: nova.toFixed(2),
        motivo: d.motivo,
        fornecedor: d.tipo === "entrada" ? d.fornecedor || m.fornecedor : null,
        utilizadorId: user.id,
      });
      return { m, delta, nova };
    });
    if (!r) return { ok: false, erro: "Material não encontrado." };

    revalidatePath("/stock");
    const un = LABEL_UNIDADE[r.m.unidade];
    const sinal = r.delta >= 0 ? "+" : "−";
    return { ok: true, mensagem: `${r.m.codigo}: ${sinal}${Math.abs(r.delta).toLocaleString("pt-PT")} ${un} · stock ${r.nova.toLocaleString("pt-PT")} ${un}` };
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível registar o movimento." };
  }
}
