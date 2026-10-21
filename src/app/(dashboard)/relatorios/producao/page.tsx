import { Suspense } from "react";
import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { Loader2 } from "lucide-react";
import { PageHeader, Stat } from "@/components/comum/page-header";
import { FiltrosRelatorio } from "@/components/relatorios/filtros-relatorio";
import { GraficoProducao } from "@/components/relatorios/grafico-producao";
import { TabelaOFs } from "@/components/relatorios/tabela-ofs";
import { db } from "@/db";
import { obras, ordensFabrico } from "@/db/schema";
import { LABEL_SEVERIDADE_NC, LABEL_TIPO_NC, type SeveridadeNC, type TipoNC } from "@/lib/dominio";
import { fmtData, fmtDuracao, fmtInt, fmtM2 } from "@/lib/formato";
import { relatorioProducao, resolverPeriodo, type FiltrosRelatorio as Filtros } from "@/lib/consultas/relatorios";
import { exigirPerfil } from "@/lib/sessao";

export const metadata: Metadata = { title: "Relatório de produção" };

const UUID = /^[0-9a-f-]{36}$/;

export default async function RelatorioProducaoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await exigirPerfil(["admin", "encarregado", "qc"]);
  const sp = await searchParams;
  const periodo = resolverPeriodo(sp);
  const filtros: Filtros = {
    ...periodo,
    obraId: sp.obra && UUID.test(sp.obra) ? sp.obra : undefined,
    ofId: sp.of && UUID.test(sp.of) ? sp.of : undefined,
  };

  const [listaObras, listaOfs] = await Promise.all([
    db.select({ id: obras.id, codigo: obras.codigo, nome: obras.nome }).from(obras).orderBy(asc(obras.codigo)),
    db.select({ id: ordensFabrico.id, numero: ordensFabrico.numero, obraId: ordensFabrico.obraId }).from(ordensFabrico).orderBy(asc(ordensFabrico.numero)),
  ]);

  return (
    <>
      <PageHeader titulo="Relatório de produção" descricao={periodo.de === periodo.ate ? fmtData(periodo.de) : `${fmtData(periodo.de)} a ${fmtData(periodo.ate)}`}>
        <FiltrosRelatorio periodo={periodo.periodo} de={periodo.de} ate={periodo.ate} obras={listaObras} ofs={listaOfs} />
      </PageHeader>
      <Suspense
        key={JSON.stringify(filtros)}
        fallback={
          <div className="flex flex-col items-center justify-center gap-3 py-32 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
            <span className="text-sm">A agregar dados de produção…</span>
          </div>
        }
      >
        <Relatorio filtros={filtros} />
      </Suspense>
    </>
  );
}

async function Relatorio({ filtros }: { filtros: Filtros }) {
  const d = await relatorioProducao(filtros);
  const semProducao = d.serie.every((s) => s.produzidas === 0 && s.aprovadas === 0) && d.kpis.produzidas === 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <Stat label="Chapas produzidas" valor={fmtInt(d.kpis.produzidas)} detalhe="aprovadas QC, expedidas ou instaladas" />
        <Stat label="m² produzidos" valor={fmtM2(d.kpis.m2, 1)} />
        <Stat label="Taxa de aprovação QC" valor={d.kpis.taxaQc === null ? "—" : `${Math.round(d.kpis.taxaQc * 100)}%`} detalhe={`${d.kpis.inspeccoes} inspecções`} />
        <Stat label="Tempo médio por chapa" valor={d.kpis.tempoMedio === null ? "—" : fmtDuracao(d.kpis.tempoMedio)} detalhe="do início ao fim de produção" />
        <Stat label="Em retrabalho" valor={d.kpis.retrabalho} detalhe="chapas no período" />
        <Stat label="NC em aberto" valor={<span className={d.kpis.ncAbertas > 0 ? "text-red-600" : undefined}>{d.kpis.ncAbertas}</span>} detalhe="à data de hoje" />
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-1 font-medium">{d.porHora ? "Produção por hora" : "Produção por dia"}</h2>
        <p className="mb-4 text-sm text-muted-foreground">Chapas que terminaram produção (incl. retrabalho) e aprovações de QC.</p>
        {semProducao ? (
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">Sem produção registada neste período.</div>
        ) : (
          <GraficoProducao serie={d.serie} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Ordens de fabrico</h2>
        {d.ofs.length ? <TabelaOFs linhas={d.ofs} /> : <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">Sem OFs para os filtros seleccionados.</div>}
      </section>

      {d.ncs.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">Não conformidades no período</h2>
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="py-2 pl-4 pr-3 font-medium">Tipo</th>
                    <th className="px-3 py-2 text-right font-medium">Ocorrências</th>
                    <th className="px-3 py-2 text-right font-medium">% do total</th>
                    <th className="py-2 pl-3 pr-4 font-medium">Severidade predominante</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const total = d.ncs.reduce((s, n) => s + n.n, 0);
                    return d.ncs.map((n, i) => (
                      <tr key={n.tipo} className="border-b last:border-0">
                        <td className="py-2.5 pl-4 pr-3 font-medium">
                          {LABEL_TIPO_NC[n.tipo as TipoNC] ?? n.tipo}
                          {i === 0 && d.ncs.length > 1 && <span className="ml-2 rounded bg-muted px-1.5 text-[11px] font-normal text-muted-foreground">mais frequente</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{n.n}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{Math.round((n.n / total) * 100)}%</td>
                        <td className="py-2.5 pl-3 pr-4">{LABEL_SEVERIDADE_NC[n.severidade as SeveridadeNC] ?? n.severidade}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
