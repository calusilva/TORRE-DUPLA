import type { Metadata } from "next";
import Link from "next/link";
import { Camera } from "lucide-react";
import { PageHeader } from "@/components/comum/page-header";
import { FilaQC } from "@/components/qc/fila-qc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LABEL_ACAO_NC, LABEL_ESTADO_NC, LABEL_SEVERIDADE_NC, LABEL_TIPO_NC, type AcaoNC, type EstadoNC, type SeveridadeNC, type TipoNC } from "@/lib/dominio";
import { fmtDataHora } from "@/lib/formato";
import { filaQC, naoConformidadesRecentes } from "@/lib/consultas/qc";
import { exigirPerfil } from "@/lib/sessao";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Controlo Qualidade" };

export default async function QCPage() {
  await exigirPerfil(["admin", "encarregado", "qc"]);
  const [fila, ncs] = await Promise.all([filaQC(), naoConformidadesRecentes()]);
  const abertas = ncs.filter((n) => n.estado === "aberta" || n.estado === "em_resolucao").length;

  return (
    <>
      <PageHeader titulo="Controlo Qualidade" descricao="Inspecção das chapas produzidas, por ordem de chegada (a primeira a ser produzida é a primeira a ser inspeccionada)." />
      <Tabs defaultValue="fila">
        <TabsList className="mb-4">
          <TabsTrigger value="fila">
            Fila de inspecção <span className="ml-1.5 tabular-nums text-muted-foreground">{fila.length}</span>
          </TabsTrigger>
          <TabsTrigger value="nc">
            Não conformidades {abertas > 0 && <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-[11px] font-semibold text-white tabular-nums">{abertas}</span>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="fila">
          <FilaQC itens={fila} />
        </TabsContent>
        <TabsContent value="nc">
          {ncs.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">Sem não conformidades registadas.</div>
          ) : (
            <ul className="space-y-2">
              {ncs.map((nc) => {
                const aberta = nc.estado === "aberta" || nc.estado === "em_resolucao";
                return (
                  <li key={nc.id} className={cn("rounded-xl border bg-card p-4", aberta && "border-red-200 dark:border-red-500/30")}>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Link href={`/of/${nc.ofId}/chapas/${nc.chapaId}`} className="font-mono font-semibold hover:underline">
                        {nc.codigo}
                      </Link>
                      <span className="font-medium">{LABEL_TIPO_NC[nc.tipo as TipoNC] ?? nc.tipo}</span>
                      <span className="rounded border px-1.5 text-xs">{LABEL_SEVERIDADE_NC[nc.severidade as SeveridadeNC] ?? nc.severidade}</span>
                      {nc.acao && <span className="text-xs text-muted-foreground">Acção: {LABEL_ACAO_NC[nc.acao as AcaoNC]}</span>}
                      <span className={cn("ml-auto rounded px-1.5 py-0.5 text-xs font-medium", aberta ? "bg-red-600 text-white" : "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300")}>
                        {LABEL_ESTADO_NC[nc.estado as EstadoNC] ?? nc.estado}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{nc.descricao}</p>
                    <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {nc.numeroOf} · {nc.reportadoPor ?? "—"} · {fmtDataHora(nc.dataReporte)}
                      </span>
                      {nc.fotoUrl && (
                        <a href={nc.fotoUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 hover:text-foreground">
                          <Camera className="size-3.5" /> Foto
                        </a>
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
