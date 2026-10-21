import "server-only";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { chapas, naoConformidades, obras, ordensFabrico, utilizadores } from "@/db/schema";

/** Fila de QC: chapas produzidas à espera de inspecção, por ordem de chegada (FIFO). */
export async function filaQC() {
  return db
    .select({
      id: chapas.id,
      codigo: chapas.codigo,
      ofId: chapas.ofId,
      numeroOf: ordensFabrico.numero,
      obraId: obras.id,
      obraCodigo: obras.codigo,
      obraNome: obras.nome,
      cliente: obras.cliente,
      zona: chapas.zona,
      piso: chapas.piso,
      coluna: chapas.coluna,
      largura: chapas.largura,
      altura: chapas.altura,
      material: chapas.material,
      operador: utilizadores.nome,
      dataFimProd: chapas.dataFimProd,
      retrabalhada: sql<boolean>`exists (select 1 from ${naoConformidades} where ${naoConformidades.chapaId} = ${chapas.id} and ${naoConformidades.estado} = 'em_resolucao')`,
    })
    .from(chapas)
    .innerJoin(ordensFabrico, eq(ordensFabrico.id, chapas.ofId))
    .innerJoin(obras, eq(obras.id, chapas.obraId))
    .leftJoin(utilizadores, eq(utilizadores.id, chapas.operadorProducaoId))
    .where(eq(chapas.estado, "produzida"))
    .orderBy(sql`${chapas.dataFimProd} asc nulls last`, asc(chapas.codigo));
}

export type ItemFilaQC = Awaited<ReturnType<typeof filaQC>>[number];

/** Não conformidades em aberto e as resolvidas mais recentes. */
export async function naoConformidadesRecentes() {
  const reportadoPor = db.$with("rp").as(db.select({ id: utilizadores.id, nome: utilizadores.nome }).from(utilizadores));
  return db
    .with(reportadoPor)
    .select({
      id: naoConformidades.id,
      chapaId: chapas.id,
      codigo: chapas.codigo,
      ofId: chapas.ofId,
      numeroOf: ordensFabrico.numero,
      tipo: naoConformidades.tipo,
      severidade: naoConformidades.severidade,
      acao: naoConformidades.acao,
      descricao: naoConformidades.descricao,
      estado: naoConformidades.estado,
      dataReporte: naoConformidades.dataReporte,
      fotoUrl: naoConformidades.fotoUrl,
      reportadoPor: reportadoPor.nome,
    })
    .from(naoConformidades)
    .innerJoin(chapas, eq(chapas.id, naoConformidades.chapaId))
    .innerJoin(ordensFabrico, eq(ordensFabrico.id, chapas.ofId))
    .leftJoin(reportadoPor, eq(reportadoPor.id, naoConformidades.reportadoPorId))
    .orderBy(sql`case when ${inArray(naoConformidades.estado, ["aberta", "em_resolucao"])} then 0 else 1 end`, desc(naoConformidades.dataReporte))
    .limit(30);
}
