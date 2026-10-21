import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { chapaEventos, chapas, naoConformidades, obras, ordensFabrico, utilizadores } from "@/db/schema";
import { ESTADOS_CHAPA, ESTADOS_PRODUZIDOS, FUSO_FABRICA, META_DIARIA_CHAPAS, type EstadoChapa } from "@/lib/dominio";

const hojeNaFabrica = (col: typeof chapas.dataFimProd) =>
  sql`(${col} at time zone ${FUSO_FABRICA})::date = (now() at time zone ${FUSO_FABRICA})::date`;

const OFS_ACTIVAS = ["em_espera", "em_producao", "suspensa"] as const;

/** Dados do dashboard do chão de fábrica (um "instantâneo" enviado por SSE). */
export async function obterDadosDashboard() {
  const [kpis, porEstadoRows, emProducao, eventos, ofs, qc] = await Promise.all([
    db
      .select({
        produzidasHoje: sql<number>`count(*) filter (where ${hojeNaFabrica(chapas.dataFimProd)})::int`,
        m2Hoje: sql<number>`coalesce(sum(${chapas.m2}) filter (where ${hojeNaFabrica(chapas.dataFimProd)}), 0)::float`,
        m2Semana: sql<number>`coalesce(sum(${chapas.m2}) filter (where ${chapas.dataFimProd} >= date_trunc('week', now() at time zone ${FUSO_FABRICA}) at time zone ${FUSO_FABRICA}), 0)::float`,
        ncAbertas: sql<number>`(select count(*)::int from ${naoConformidades} where ${naoConformidades.estado} in ('aberta','em_resolucao'))`,
      })
      .from(chapas),
    db
      .select({ estado: chapas.estado, n: sql<number>`count(*)::int` })
      .from(chapas)
      .innerJoin(ordensFabrico, eq(ordensFabrico.id, chapas.ofId))
      .where(inArray(ordensFabrico.estado, [...OFS_ACTIVAS]))
      .groupBy(chapas.estado),
    db
      .select({
        id: chapas.id,
        codigo: chapas.codigo,
        numeroOf: ordensFabrico.numero,
        operador: utilizadores.nome,
        zona: chapas.zona,
        piso: chapas.piso,
        coluna: chapas.coluna,
        largura: chapas.largura,
        altura: chapas.altura,
        inicio: chapas.dataInicioProd,
      })
      .from(chapas)
      .innerJoin(ordensFabrico, eq(ordensFabrico.id, chapas.ofId))
      .leftJoin(utilizadores, eq(utilizadores.id, chapas.operadorProducaoId))
      .where(eq(chapas.estado, "em_producao"))
      .orderBy(asc(chapas.dataInicioProd)),
    db
      .select({
        id: chapaEventos.id,
        codigo: chapas.codigo,
        tipo: chapaEventos.tipo,
        de: chapaEventos.estadoAnterior,
        para: chapaEventos.estadoNovo,
        utilizador: utilizadores.nome,
        timestamp: chapaEventos.timestamp,
      })
      .from(chapaEventos)
      .innerJoin(chapas, eq(chapas.id, chapaEventos.chapaId))
      .leftJoin(utilizadores, eq(utilizadores.id, chapaEventos.utilizadorId))
      .where(and(isNotNull(chapaEventos.estadoNovo), ne(chapaEventos.tipo, "criacao"), sql`${chapaEventos.estadoAnterior} is distinct from ${chapaEventos.estadoNovo}`))
      .orderBy(desc(chapaEventos.timestamp))
      .limit(5),
    db
      .select({
        id: ordensFabrico.id,
        numero: ordensFabrico.numero,
        cliente: obras.cliente,
        zona: ordensFabrico.zona,
        prioridade: ordensFabrico.prioridade,
        total: sql<number>`count(${chapas.id})::int`,
        produzidas: sql<number>`count(${chapas.id}) filter (where ${chapas.estado} in (${sql.join(ESTADOS_PRODUZIDOS.map((e) => sql`${e}`), sql`, `)}))::int`,
        emProducao: sql<number>`count(${chapas.id}) filter (where ${chapas.estado} = 'em_producao')::int`,
      })
      .from(ordensFabrico)
      .innerJoin(obras, eq(obras.id, ordensFabrico.obraId))
      .leftJoin(chapas, eq(chapas.ofId, ordensFabrico.id))
      .where(eq(ordensFabrico.estado, "em_producao"))
      .groupBy(ordensFabrico.id, obras.cliente)
      .orderBy(asc(ordensFabrico.prioridade), asc(ordensFabrico.numero)),
    // Taxa de aprovação QC nos últimos 30 dias (primeira inspecção e reinspecções).
    db
      .select({
        aprovadas: sql<number>`count(*) filter (where ${chapaEventos.tipo} = 'qc_aprovado')::int`,
        reprovadas: sql<number>`count(*) filter (where ${chapaEventos.tipo} = 'qc_reprovado')::int`,
      })
      .from(chapaEventos)
      .where(and(inArray(chapaEventos.tipo, ["qc_aprovado", "qc_reprovado"]), sql`${chapaEventos.timestamp} > now() - interval '30 days'`)),
  ]);

  const porEstado = Object.fromEntries(ESTADOS_CHAPA.map((e) => [e, 0])) as Record<EstadoChapa, number>;
  for (const r of porEstadoRows) porEstado[r.estado] = r.n;
  const totalQc = qc[0].aprovadas + qc[0].reprovadas;

  return {
    geradoEm: new Date().toISOString(),
    kpis: {
      ...kpis[0],
      meta: META_DIARIA_CHAPAS,
      ofsActivas: ofs.length,
      taxaQc: totalQc ? qc[0].aprovadas / totalQc : null,
      inspeccoesQc: totalQc,
    },
    porEstado,
    emProducao: emProducao.map((c) => ({ ...c, inicio: c.inicio?.toISOString() ?? null })),
    eventos: eventos.map((e) => ({ ...e, timestamp: e.timestamp?.toISOString() ?? null })),
    ofs,
  };
}

export type DadosDashboard = Awaited<ReturnType<typeof obterDadosDashboard>>;

/** "Versão" barata dos dados de uma obra — muda sempre que uma chapa é alterada. */
export async function versaoObra(obraId: string) {
  const [r] = await db
    .select({ v: sql<string>`coalesce(max(${chapas.updatedAt})::text, '') || ':' || count(*)::text` })
    .from(chapas)
    .where(eq(chapas.obraId, obraId));
  return r.v;
}
