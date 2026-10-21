import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/** Contadores da sidebar numa única consulta. */
export async function obterContadores() {
  const [r] = await db.execute<{ producao: number; qc: number; stock: number }>(sql`
    select
      (select count(*)::int from chapas where estado = 'em_producao') as producao,
      (select count(*)::int from chapas where estado = 'produzida') as qc,
      (select count(*)::int from materiais where stock_atual < stock_minimo) as stock
  `);
  return { producao: Number(r.producao), qc: Number(r.qc), stock: Number(r.stock) };
}

export type Contadores = Awaited<ReturnType<typeof obterContadores>>;
