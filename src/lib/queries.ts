import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { chapaEventos, chapas, etiquetasImpressas, naoConformidades, obras, ordensFabrico, utilizadores } from "@/db/schema";
import { ESTADOS_PRODUZIDOS, type EstadoObra, type EstadoOF, type Perfil } from "@/lib/dominio";

const listaSql = (v: readonly string[]) => sql.join(v.map((x) => sql`${x}`), sql`, `);

/** Agregados de progresso calculados a partir das chapas. */
const progressoChapas = {
  total: sql<number>`count(${chapas.id})::int`,
  produzidas: sql<number>`count(${chapas.id}) filter (where ${chapas.estado} in (${listaSql(ESTADOS_PRODUZIDOS)}))::int`,
  emProducao: sql<number>`count(${chapas.id}) filter (where ${chapas.estado} = 'em_producao')::int`,
  aprovadas: sql<number>`count(${chapas.id}) filter (where ${chapas.estado} in ('aprovada_qc','expedida','instalada'))::int`,
  m2Total: sql<number>`coalesce(sum(${chapas.m2}), 0)::float`,
  m2Produzidos: sql<number>`coalesce(sum(${chapas.m2}) filter (where ${chapas.estado} in (${listaSql(ESTADOS_PRODUZIDOS)})), 0)::float`,
};

export type Progresso = { total: number; produzidas: number; emProducao: number; aprovadas: number; m2Total: number; m2Produzidos: number };

// ------------------------------------------------------------
// Obras
// ------------------------------------------------------------
export async function listarObras(filtros: { q?: string; estado?: EstadoObra } = {}) {
  const cond: SQL[] = [];
  if (filtros.q) {
    const termo = `%${filtros.q}%`;
    cond.push(or(ilike(obras.codigo, termo), ilike(obras.nome, termo), ilike(obras.cliente, termo), ilike(obras.localObra, termo))!);
  }
  if (filtros.estado) cond.push(eq(obras.estado, filtros.estado));

  const nOfs = db
    .select({ obraId: ordensFabrico.obraId, n: count().as("n") })
    .from(ordensFabrico)
    .groupBy(ordensFabrico.obraId)
    .as("n_ofs");

  return db
    .select({
      obra: obras,
      encarregado: utilizadores.nome,
      nOfs: sql<number>`coalesce(max(${nOfs.n}), 0)::int`,
      ...progressoChapas,
    })
    .from(obras)
    .leftJoin(utilizadores, eq(utilizadores.id, obras.encarregadoId))
    .leftJoin(chapas, eq(chapas.obraId, obras.id))
    .leftJoin(nOfs, eq(nOfs.obraId, obras.id))
    .where(cond.length ? and(...cond) : undefined)
    .groupBy(obras.id, utilizadores.nome)
    .orderBy(sql`case ${obras.estado} when 'em_producao' then 0 when 'planeamento' then 1 else 2 end`, desc(obras.codigo));
}

export async function obterObra(id: string) {
  const [obra] = await db
    .select({ obra: obras, encarregado: utilizadores.nome })
    .from(obras)
    .leftJoin(utilizadores, eq(utilizadores.id, obras.encarregadoId))
    .where(eq(obras.id, id));
  return obra ?? null;
}

// ------------------------------------------------------------
// Ordens de fabrico
// ------------------------------------------------------------
export async function listarOFs(filtros: { q?: string; estado?: EstadoOF; obraId?: string } = {}) {
  const cond: SQL[] = [];
  if (filtros.q) {
    const termo = `%${filtros.q}%`;
    cond.push(or(ilike(ordensFabrico.numero, termo), ilike(ordensFabrico.descricao, termo), ilike(ordensFabrico.zona, termo), ilike(obras.cliente, termo), ilike(obras.codigo, termo))!);
  }
  if (filtros.estado) cond.push(eq(ordensFabrico.estado, filtros.estado));
  if (filtros.obraId) cond.push(eq(ordensFabrico.obraId, filtros.obraId));

  return db
    .select({
      of: ordensFabrico,
      obra: { id: obras.id, codigo: obras.codigo, nome: obras.nome, cliente: obras.cliente },
      responsavel: utilizadores.nome,
      ...progressoChapas,
    })
    .from(ordensFabrico)
    .innerJoin(obras, eq(obras.id, ordensFabrico.obraId))
    .leftJoin(utilizadores, eq(utilizadores.id, ordensFabrico.operadorResponsavelId))
    .leftJoin(chapas, eq(chapas.ofId, ordensFabrico.id))
    .where(cond.length ? and(...cond) : undefined)
    .groupBy(ordensFabrico.id, obras.id, utilizadores.nome)
    .orderBy(
      sql`case ${ordensFabrico.estado} when 'em_producao' then 0 when 'em_espera' then 1 when 'suspensa' then 2 else 3 end`,
      asc(ordensFabrico.prioridade),
      desc(ordensFabrico.numero),
    );
}

export async function obterOF(id: string) {
  const [linha] = await db
    .select({ of: ordensFabrico, obra: obras, responsavel: utilizadores.nome })
    .from(ordensFabrico)
    .innerJoin(obras, eq(obras.id, ordensFabrico.obraId))
    .leftJoin(utilizadores, eq(utilizadores.id, ordensFabrico.operadorResponsavelId))
    .where(eq(ordensFabrico.id, id));
  if (!linha) return null;

  const [progresso] = await db.select(progressoChapas).from(chapas).where(eq(chapas.ofId, id));
  const [{ ncAbertas }] = await db
    .select({ ncAbertas: count() })
    .from(naoConformidades)
    .where(and(eq(naoConformidades.ofId, id), inArray(naoConformidades.estado, ["aberta", "em_resolucao"])));

  return { ...linha, progresso: progresso as Progresso, ncAbertas };
}

export type ChapaLista = Awaited<ReturnType<typeof listarChapasOF>>[number];

export async function listarChapasOF(ofId: string) {
  const etiquetas = db
    .select({ chapaId: etiquetasImpressas.chapaId, n: count().as("n") })
    .from(etiquetasImpressas)
    .groupBy(etiquetasImpressas.chapaId)
    .as("etq");

  return db
    .select({
      id: chapas.id,
      codigo: chapas.codigo,
      estado: chapas.estado,
      zona: chapas.zona,
      piso: chapas.piso,
      coluna: chapas.coluna,
      linha: chapas.linha,
      largura: chapas.largura,
      altura: chapas.altura,
      m2: chapas.m2,
      peso: chapas.peso,
      material: chapas.material,
      temNaoConformidade: chapas.temNaoConformidade,
      dataInicioProd: chapas.dataInicioProd,
      dataFimProd: chapas.dataFimProd,
      operador: utilizadores.nome,
      etiquetas: sql<number>`coalesce(${etiquetas.n}, 0)::int`,
    })
    .from(chapas)
    .leftJoin(utilizadores, eq(utilizadores.id, chapas.operadorProducaoId))
    .leftJoin(etiquetas, eq(etiquetas.chapaId, chapas.id))
    .where(eq(chapas.ofId, ofId))
    .orderBy(asc(chapas.codigo));
}

/** Zonas existentes numa OF, com a extensão ocupada no layout (para posicionar novos lotes). */
export async function zonasDaObra(obraId: string) {
  return db
    .select({
      zona: chapas.zona,
      maxX: sql<number>`max(${chapas.posicaoX} + ${chapas.largura} * 0.1)::float`,
      maxColuna: sql<number>`count(distinct ${chapas.coluna})::int`,
    })
    .from(chapas)
    .where(eq(chapas.obraId, obraId))
    .groupBy(chapas.zona);
}

// ------------------------------------------------------------
// Chapas
// ------------------------------------------------------------
export async function obterChapa(id: string) {
  const chapa = await db.query.chapas.findFirst({
    where: eq(chapas.id, id),
    with: {
      of: true,
      obra: true,
      operadorProducao: { columns: { nome: true } },
      operadorQc: { columns: { nome: true } },
      eventos: {
        orderBy: [desc(chapaEventos.timestamp)],
        with: { utilizador: { columns: { nome: true, perfil: true } } },
      },
      naoConformidades: {
        orderBy: [desc(naoConformidades.dataReporte)],
        with: { reportadoPor: { columns: { nome: true } }, resolvidaPor: { columns: { nome: true } } },
      },
      etiquetas: {
        orderBy: [desc(etiquetasImpressas.dataImpressao)],
        with: { impressaPor: { columns: { nome: true } } },
      },
    },
  });
  return chapa ?? null;
}

export type ChapaDetalhe = NonNullable<Awaited<ReturnType<typeof obterChapa>>>;

/** Dados necessários para imprimir etiquetas. */
export async function chapasParaEtiqueta(ids: string[]) {
  if (!ids.length) return [];
  return db
    .select({
      id: chapas.id,
      codigo: chapas.codigo,
      qrCodeData: chapas.qrCodeData,
      zona: chapas.zona,
      piso: chapas.piso,
      coluna: chapas.coluna,
      largura: chapas.largura,
      altura: chapas.altura,
      espessura: chapas.espessura,
      m2: chapas.m2,
      peso: chapas.peso,
      material: chapas.material,
      cor: chapas.cor,
      numeroOf: ordensFabrico.numero,
      codigoObra: obras.codigo,
      nomeObra: obras.nome,
      cliente: obras.cliente,
    })
    .from(chapas)
    .innerJoin(ordensFabrico, eq(ordensFabrico.id, chapas.ofId))
    .innerJoin(obras, eq(obras.id, chapas.obraId))
    .where(inArray(chapas.id, ids))
    .orderBy(asc(chapas.codigo));
}

export type ChapaEtiqueta = Awaited<ReturnType<typeof chapasParaEtiqueta>>[number];

// ------------------------------------------------------------
// Utilizadores
// ------------------------------------------------------------
export async function utilizadoresPorPerfil(perfis: Perfil[]) {
  return db
    .select({ id: utilizadores.id, nome: utilizadores.nome, perfil: utilizadores.perfil })
    .from(utilizadores)
    .where(and(eq(utilizadores.ativo, true), inArray(utilizadores.perfil, perfis)))
    .orderBy(asc(utilizadores.nome));
}

/** Progresso por zona de uma obra (barras "Fachada Norte ███░░ 78%"). */
export async function progressoPorZona(obraId: string) {
  return db
    .select({ zona: chapas.zona, ...progressoChapas })
    .from(chapas)
    .where(eq(chapas.obraId, obraId))
    .groupBy(chapas.zona)
    .orderBy(asc(chapas.zona));
}

/** Chapas de uma zona da obra (para mini-mapa de localização). */
export async function chapasDaZona(obraId: string, zona: string | null) {
  return db
    .select({ id: chapas.id, estado: chapas.estado, x: chapas.posicaoX, y: chapas.posicaoY, largura: chapas.largura, altura: chapas.altura })
    .from(chapas)
    .where(and(eq(chapas.obraId, obraId), zona === null ? sql`${chapas.zona} is null` : eq(chapas.zona, zona)));
}

// ------------------------------------------------------------
// Scan / transições
// ------------------------------------------------------------
export type ChapaScan = Awaited<ReturnType<typeof obterChapaScan>>;

/** Dados da chapa para o cartão de scan e painel do layout — uma única query. */
export async function obterChapaScan(filtro: { id: string } | { codigo: string }) {
  const ncAbertas = sql<number>`(select count(*)::int from ${naoConformidades} where ${naoConformidades.chapaId} = ${chapas.id} and ${naoConformidades.estado} in ('aberta','em_resolucao'))`;
  const [c] = await db
    .select({
      id: chapas.id,
      codigo: chapas.codigo,
      estado: chapas.estado,
      ofId: chapas.ofId,
      numeroOf: ordensFabrico.numero,
      estadoOf: ordensFabrico.estado,
      obraId: obras.id,
      obraCodigo: obras.codigo,
      obraNome: obras.nome,
      cliente: obras.cliente,
      zona: chapas.zona,
      piso: chapas.piso,
      coluna: chapas.coluna,
      largura: chapas.largura,
      altura: chapas.altura,
      m2: chapas.m2,
      material: chapas.material,
      operador: utilizadores.nome,
      dataInicioProd: chapas.dataInicioProd,
      dataFimProd: chapas.dataFimProd,
      temNaoConformidade: chapas.temNaoConformidade,
      ncAbertas,
      updatedAt: chapas.updatedAt,
    })
    .from(chapas)
    .innerJoin(ordensFabrico, eq(ordensFabrico.id, chapas.ofId))
    .innerJoin(obras, eq(obras.id, chapas.obraId))
    .leftJoin(utilizadores, eq(utilizadores.id, chapas.operadorProducaoId))
    .where("id" in filtro ? eq(chapas.id, filtro.id) : eq(chapas.codigo, filtro.codigo));
  return c ?? null;
}
