import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ExternalLink, Printer } from "lucide-react";
import { PageHeader } from "@/components/comum/page-header";
import { Historico } from "@/components/chapas/historico";
import { MiniMapa } from "@/components/chapas/mini-mapa";
import { Button } from "@/components/ui/button";
import { EstadoChapaBadge } from "@/components/ui/EstadoChapaBadge";
import { LABEL_ACAO_NC, LABEL_ESTADO_NC, LABEL_SEVERIDADE_NC, LABEL_TIPO_NC, type AcaoNC, type EstadoNC, type SeveridadeNC, type TipoNC } from "@/lib/dominio";
import { fmtDataHora, fmtDimensoes, fmtDuracao, fmtInt, fmtKg, fmtM2, minutosEntre } from "@/lib/formato";
import { code128Svg, conteudoQR, qrSvg } from "@/lib/qr";
import { chapasDaZona, obterChapa } from "@/lib/queries";
import { exigirSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";

type Params = { params: Promise<{ ofId: string; chapaId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { chapaId } = await params;
  const c = await obterChapa(chapaId).catch(() => null);
  return { title: c?.codigo ?? "Chapa" };
}

export default async function ChapaPage({ params }: Params) {
  await exigirSessao();
  const { ofId, chapaId } = await params;
  const chapa = await obterChapa(chapaId).catch(() => null);
  if (!chapa || chapa.ofId !== ofId) notFound();

  const [qr, barcode, vizinhas] = await Promise.all([qrSvg(conteudoQR(chapa)), code128Svg(chapa.codigo), chapasDaZona(chapa.obraId, chapa.zona)]);
  const duracaoProd = chapa.dataInicioProd ? minutosEntre(chapa.dataInicioProd, chapa.dataFimProd ?? new Date()) : null;

  const dados: [string, React.ReactNode][] = [
    ["OF", <Link key="of" href={`/of/${chapa.ofId}`} className="font-mono hover:underline">{chapa.of.numero}</Link>],
    ["Obra", <span key="obra"><span className="font-mono">{chapa.obra.codigo}</span> · {chapa.obra.nome}</span>],
    ["Cliente", chapa.obra.cliente],
    ["Zona", chapa.zona],
    ["Piso / Coluna / Linha", `Piso ${chapa.piso} · Col. ${chapa.coluna} · Linha ${chapa.linha}`],
    ["Dimensões", fmtDimensoes(chapa.largura, chapa.altura)],
    ["Espessura", chapa.espessura ? `${fmtInt(chapa.espessura)} mm` : "—"],
    ["Área", fmtM2(chapa.m2)],
    ["Peso estimado", fmtKg(chapa.peso)],
    ["Material", chapa.material],
    ["Cor / Acabamento", [chapa.cor, chapa.acabamento].filter(Boolean).join(" · ")],
    ["Posição no layout", `X ${fmtInt(chapa.posicaoX)} · Y ${fmtInt(chapa.posicaoY)} px`],
  ];
  const tempos: [string, React.ReactNode][] = [
    ["Início de produção", fmtDataHora(chapa.dataInicioProd)],
    ["Fim de produção", fmtDataHora(chapa.dataFimProd)],
    ["Duração", duracaoProd !== null ? `${fmtDuracao(duracaoProd)}${chapa.dataFimProd ? "" : " (a decorrer)"}` : "—"],
    ["Operador", chapa.operadorProducao?.nome ?? "—"],
    ["QC", chapa.dataQC ? `${fmtDataHora(chapa.dataQC)} · ${chapa.operadorQc?.nome ?? ""}` : "—"],
    ["Expedição", fmtDataHora(chapa.dataExpedicao)],
    ["Instalação", fmtDataHora(chapa.dataInstalacao)],
  ];

  return (
    <>
      <PageHeader
        voltar={{ href: `/of/${chapa.ofId}`, label: chapa.of.numero }}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{chapa.codigo}</span>
            <EstadoChapaBadge estado={chapa.estado} grande />
            {chapa.temNaoConformidade && (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-500/15 dark:text-red-300">
                <AlertTriangle className="size-3.5" /> Não conformidade
              </span>
            )}
          </span>
        }
        descricao={`${chapa.zona} · Piso ${chapa.piso} · Coluna ${chapa.coluna} · ${chapa.material}`}
        accoes={
          <>
            <Button variant="outline" asChild>
              <Link href={`/rastreabilidade/${chapa.codigo}`} target="_blank">
                <ExternalLink /> Rastreabilidade
              </Link>
            </Button>
            <Button asChild>
              <a href={`/api/chapas/${chapa.id}/etiqueta`} target="_blank" rel="noopener">
                <Printer /> Imprimir etiqueta
              </a>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="grid gap-6 rounded-xl border bg-card p-5 md:grid-cols-2">
            <ListaDados titulo="Chapa" linhas={dados} />
            <ListaDados titulo="Produção" linhas={tempos} />
          </section>

          {chapa.naoConformidades.length > 0 && (
            <section className="rounded-xl border bg-card p-5">
              <h3 className="mb-4 font-medium">Não conformidades</h3>
              <div className="space-y-3">
                {chapa.naoConformidades.map((nc) => {
                  const aberta = nc.estado === "aberta" || nc.estado === "em_resolucao";
                  return (
                    <div key={nc.id} className={cn("rounded-lg border p-3", aberta && "border-red-200 bg-red-50/50 dark:border-red-500/30 dark:bg-red-500/5")}>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{LABEL_TIPO_NC[nc.tipo as TipoNC] ?? nc.tipo}</span>
                        <span className="rounded border px-1.5 text-xs">{LABEL_SEVERIDADE_NC[nc.severidade as SeveridadeNC] ?? nc.severidade}</span>
                        <span className={cn("rounded px-1.5 text-xs", aberta ? "bg-red-600 text-white" : "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300")}>
                          {LABEL_ESTADO_NC[nc.estado as EstadoNC] ?? nc.estado}
                        </span>
                        {nc.acao && <span className="text-xs text-muted-foreground">Acção: {LABEL_ACAO_NC[nc.acao as AcaoNC] ?? nc.acao}</span>}
                      </div>
                      <p className="mt-1 text-sm">{nc.descricao}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Reportada por {nc.reportadoPor?.nome ?? "—"} em {fmtDataHora(nc.dataReporte)}
                        {nc.dataResolucao && ` · resolvida por ${nc.resolvidaPor?.nome ?? "—"} em ${fmtDataHora(nc.dataResolucao)}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="rounded-xl border bg-card p-5">
            <h3 className="mb-5 font-medium">Histórico</h3>
            <Historico eventos={chapa.eventos} />
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border bg-card p-5">
            <div className="mx-auto w-44 rounded-lg bg-white p-3 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="mt-4 rounded-lg bg-white px-3 pb-2 pt-3 [&_svg]:h-10 [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: barcode }} />
            <div className="mt-1 text-center font-mono text-xs tracking-widest">{chapa.codigo}</div>
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Conteúdo do QR Code</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted p-2 font-mono text-[11px]">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(conteudoQR(chapa)), null, 2);
                  } catch {
                    return conteudoQR(chapa);
                  }
                })()}
              </pre>
            </details>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 text-sm font-medium">Localização — {chapa.zona}</h3>
            <MiniMapa chapas={vizinhas} actualId={chapa.id} />
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 text-sm font-medium">Etiquetas impressas</h3>
            {chapa.etiquetas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda sem etiqueta.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {chapa.etiquetas.map((e) => (
                  <li key={e.id} className="flex justify-between gap-2">
                    <span>
                      {fmtDataHora(e.dataImpressao)}
                      {e.reimpressao && <span className="ml-1.5 rounded bg-muted px-1 text-[11px]">reimpressão</span>}
                    </span>
                    <span className="truncate text-muted-foreground">{e.impressaPor?.nome}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

function ListaDados({ titulo, linhas }: { titulo: string; linhas: [string, React.ReactNode][] }) {
  return (
    <div>
      <h3 className="mb-3 font-medium">{titulo}</h3>
      <dl className="grid grid-cols-[9.5rem_1fr] gap-x-3 gap-y-2 text-sm">
        {linhas.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="min-w-0">{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
