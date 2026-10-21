import "server-only";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { chapas, materiais, movimentosStock, obras, ordensFabrico, utilizadores } from "@/db/schema";
import { somarConsumos, type CodigoMaterial } from "@/lib/consumos";
import { FUSO_FABRICA, type TipoMovimento, type UnidadeMaterial } from "@/lib/dominio";

const OFS_ACTIVAS = ["em_espera", "em_producao", "suspensa"] as const;
const colunasConsumo = { largura: chapas.largura, altura: chapas.altura, espessura: chapas.espessura, material: chapas.material, cor: chapas.cor };

/**
 * Materiais com reserva e disponível. A reserva é o consumo teórico das chapas ainda
 * por produzir em OFs activas — as que já entraram em produção já deram saída de stock.
 */
export async function listarMateriais() {
  const [lista, porProduzir] = await Promise.all([
    db.select().from(materiais).orderBy(asc(materiais.codigo)),
    db
      .select(colunasConsumo)
      .from(chapas)
      .innerJoin(ordensFabrico, eq(ordensFabrico.id, chapas.ofId))
      .where(and(eq(chapas.estado, "por_produzir"), inArray(ordensFabrico.estado, [...OFS_ACTIVAS]))),
  ]);
  const reservas = somarConsumos(porProduzir);
  return lista.map((m) => {
    const actual = Number(m.stockAtual);
    const reservado = Math.round((reservas[m.codigo as CodigoMaterial] ?? 0) * 100) / 100;
    return {
      ...m,
      actual,
      minimo: Number(m.stockMinimo),
      maximo: m.stockMaximo ? Number(m.stockMaximo) : null,
      preco: m.precoUnitario ? Number(m.precoUnitario) : 0,
      reservado,
      disponivel: Math.round((actual - reservado) * 100) / 100,
    };
  });
}

export type MaterialLista = Awaited<ReturnType<typeof listarMateriais>>[number];

/** Consumo (saídas) do mês corrente, agregado por unidade. */
export async function consumoMes() {
  const rows = await db
    .select({ unidade: materiais.unidade, total: sql<number>`coalesce(-sum(${movimentosStock.quantidade}), 0)::float` })
    .from(movimentosStock)
    .innerJoin(materiais, eq(materiais.id, movimentosStock.materialId))
    .where(and(eq(movimentosStock.tipo, "saida"), sql`${movimentosStock.createdAt} >= date_trunc('month', now() at time zone ${FUSO_FABRICA}) at time zone ${FUSO_FABRICA}`))
    .groupBy(materiais.unidade);
  return rows as { unidade: UnidadeMaterial; total: number }[];
}

export async function listarMovimentos(filtros: { materialId?: string; tipo?: TipoMovimento } = {}) {
  const cond: SQL[] = [];
  if (filtros.materialId) cond.push(eq(movimentosStock.materialId, filtros.materialId));
  if (filtros.tipo) cond.push(eq(movimentosStock.tipo, filtros.tipo));
  return db
    .select({
      id: movimentosStock.id,
      data: movimentosStock.createdAt,
      tipo: movimentosStock.tipo,
      quantidade: movimentosStock.quantidade,
      quantidadeNova: movimentosStock.quantidadeNova,
      motivo: movimentosStock.motivo,
      fornecedor: movimentosStock.fornecedor,
      ofId: movimentosStock.ofId,
      numeroOf: ordensFabrico.numero,
      materialCodigo: materiais.codigo,
      materialNome: materiais.nome,
      unidade: materiais.unidade,
      utilizador: utilizadores.nome,
    })
    .from(movimentosStock)
    .innerJoin(materiais, eq(materiais.id, movimentosStock.materialId))
    .leftJoin(ordensFabrico, eq(ordensFabrico.id, movimentosStock.ofId))
    .leftJoin(utilizadores, eq(utilizadores.id, movimentosStock.utilizadorId))
    .where(cond.length ? and(...cond) : undefined)
    .orderBy(desc(movimentosStock.createdAt))
    .limit(300);
}

/** Consumo teórico por OF activa: total da OF, já consumido (chapas iniciadas) e por consumir. */
export async function consumosPorOF() {
  const [ofs, lista, mats] = await Promise.all([
    db
      .select({ id: ordensFabrico.id, numero: ordensFabrico.numero, descricao: ordensFabrico.descricao, estado: ordensFabrico.estado, cliente: obras.cliente })
      .from(ordensFabrico)
      .innerJoin(obras, eq(obras.id, ordensFabrico.obraId))
      .where(inArray(ordensFabrico.estado, [...OFS_ACTIVAS]))
      .orderBy(asc(ordensFabrico.numero)),
    db
      .select({ ...colunasConsumo, ofId: chapas.ofId, estado: chapas.estado })
      .from(chapas)
      .innerJoin(ordensFabrico, eq(ordensFabrico.id, chapas.ofId))
      .where(inArray(ordensFabrico.estado, [...OFS_ACTIVAS])),
    db.select({ codigo: materiais.codigo, nome: materiais.nome, unidade: materiais.unidade, actual: materiais.stockAtual }).from(materiais).orderBy(asc(materiais.codigo)),
  ]);

  return ofs.map((of) => {
    const daOf = lista.filter((c) => c.ofId === of.id);
    const total = somarConsumos(daOf);
    const consumido = somarConsumos(daOf.filter((c) => c.estado !== "por_produzir"));
    return {
      ...of,
      chapas: daOf.length,
      iniciadas: daOf.filter((c) => c.estado !== "por_produzir").length,
      linhas: mats
        .filter((m) => total[m.codigo as CodigoMaterial])
        .map((m) => {
          const t = total[m.codigo as CodigoMaterial] ?? 0;
          const c = consumido[m.codigo as CodigoMaterial] ?? 0;
          return { codigo: m.codigo, nome: m.nome, unidade: m.unidade, total: t, consumido: c, porConsumir: t - c, stock: Number(m.actual) };
        }),
    };
  });
}

/** Número de referências abaixo do mínimo (badge da sidebar). */
export async function referenciasAbaixoMinimo() {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(materiais).where(sql`${materiais.stockAtual} < ${materiais.stockMinimo}`);
  return r.n;
}
