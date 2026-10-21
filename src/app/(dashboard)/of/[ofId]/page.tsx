import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, CheckCircle2, LayoutGrid, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { eliminarOF, mudarEstadoOF } from "@/app/actions/ofs";
import { AccaoConfirmada } from "@/components/comum/accao-confirmada";
import { EstadoOFBadge, PrioridadeBadge } from "@/components/comum/estado-badges";
import { PageHeader, Stat, Vazio } from "@/components/comum/page-header";
import { ProgressoOF } from "@/components/comum/progresso-of";
import { AdicionarLote } from "@/components/of/adicionar-lote";
import { TabelaChapas } from "@/components/of/tabela-chapas";
import { Button } from "@/components/ui/button";
import { diasAte, fmtData, fmtDataHora, fmtKg, fmtM2 } from "@/lib/formato";
import { LISTA_MATERIAIS } from "@/lib/materiais";
import { listarChapasOF, obterOF } from "@/lib/queries";
import { exigirSessao } from "@/lib/sessao";

type Params = { params: Promise<{ ofId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { ofId } = await params;
  const d = await obterOF(ofId).catch(() => null);
  return { title: d?.of.numero ?? "OF" };
}

export default async function OFPage({ params }: Params) {
  const user = await exigirSessao();
  const gestao = user.perfil === "admin" || user.perfil === "encarregado";
  const { ofId } = await params;
  const dados = await obterOF(ofId).catch(() => null);
  if (!dados) notFound();
  const { of, obra, responsavel, progresso, ncAbertas } = dados;
  const chapas = await listarChapasOF(ofId);

  const zonas = [...new Set(chapas.map((c) => c.zona).filter(Boolean) as string[])];
  const pesoTotal = chapas.reduce((s, c) => s + Number(c.peso ?? 0), 0);
  const comEtiqueta = chapas.filter((c) => c.etiquetas > 0).length;
  const iniciadas = chapas.some((c) => c.estado !== "por_produzir");
  const dias = of.estado === "concluida" || of.estado === "cancelada" ? null : diasAte(of.dataFechoPrevisto);
  const pisos = chapas.filter((c) => c.zona === zonas[0] && c.piso !== null).map((c) => c.piso!);
  const pisoInicial = pisos.length ? Math.min(...pisos) : 1;
  const materialInicial = LISTA_MATERIAIS.find((m) => m.nome === chapas[0]?.material)?.id;
  const editavel = gestao && of.estado !== "concluida" && of.estado !== "cancelada";

  return (
    <>
      <PageHeader
        voltar={{ href: "/of", label: "Ordens de Fabrico" }}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{of.numero}</span>
            <EstadoOFBadge estado={of.estado} />
            <PrioridadeBadge prioridade={of.prioridade} />
          </span>
        }
        descricao={
          <div className="space-y-1">
            <div className="text-foreground">{of.descricao}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Link href={gestao ? `/obras/${obra.id}` : "#"} className="hover:text-foreground hover:underline">
                <span className="font-mono">{obra.codigo}</span> · {obra.nome}
              </Link>
              <span>{obra.cliente}</span>
              {responsavel && <span>Responsável: {responsavel}</span>}
              <span>Aberta {fmtDataHora(of.dataAbertura)}</span>
            </div>
          </div>
        }
        accoes={
          gestao && (
            <>
              {of.estado === "em_espera" && (
                <AccaoConfirmada accao={mudarEstadoOF.bind(null, of.id, "em_producao")} variant="default">
                  <Play /> Iniciar produção
                </AccaoConfirmada>
              )}
              {of.estado === "em_producao" && (
                <AccaoConfirmada
                  accao={mudarEstadoOF.bind(null, of.id, "suspensa")}
                  confirmacao={{ titulo: `Suspender ${of.numero}?`, descricao: "A OF deixa de aparecer como activa no chão de fábrica até ser retomada.", botao: "Suspender" }}
                >
                  <Pause /> Suspender
                </AccaoConfirmada>
              )}
              {of.estado === "suspensa" && (
                <AccaoConfirmada accao={mudarEstadoOF.bind(null, of.id, "em_producao")} variant="default">
                  <Play /> Retomar
                </AccaoConfirmada>
              )}
              {of.estado === "em_producao" && (
                <AccaoConfirmada
                  accao={mudarEstadoOF.bind(null, of.id, "concluida")}
                  confirmacao={{ titulo: `Concluir ${of.numero}?`, descricao: "Só é possível concluir quando todas as chapas estiverem produzidas e sem retrabalho pendente.", botao: "Concluir OF" }}
                >
                  <CheckCircle2 /> Concluir
                </AccaoConfirmada>
              )}
              {editavel && <AdicionarLote ofId={of.id} numero={of.numero} zonasExistentes={zonas} materialInicial={materialInicial} pisoInicial={pisoInicial} />}
              <Button variant="outline" asChild>
                <Link href={`/obras/${obra.id}/layout-visual`}>
                  <LayoutGrid /> Layout
                </Link>
              </Button>
              {editavel && (
                <Button variant="outline" size="icon" asChild aria-label="Editar OF">
                  <Link href={`/of/${of.id}/editar`}>
                    <Pencil />
                  </Link>
                </Button>
              )}
              {(of.estado === "em_espera" || of.estado === "suspensa") && !iniciadas && (
                <AccaoConfirmada
                  accao={mudarEstadoOF.bind(null, of.id, "cancelada")}
                  variant="outline"
                  confirmacao={{ titulo: `Cancelar ${of.numero}?`, descricao: "A OF fica registada como cancelada e não pode voltar a produção.", botao: "Cancelar OF", destrutiva: true }}
                >
                  <Ban /> Cancelar
                </AccaoConfirmada>
              )}
              {!iniciadas && of.estado !== "concluida" && (
                <AccaoConfirmada
                  accao={eliminarOF.bind(null, of.id)}
                  redirecionar="/of"
                  variant="destructive"
                  size="icon"
                  confirmacao={{
                    titulo: `Eliminar ${of.numero}?`,
                    descricao: `A OF e as suas ${chapas.length} chapas serão eliminadas definitivamente.`,
                    botao: "Eliminar",
                    destrutiva: true,
                  }}
                >
                  <Trash2 />
                </AccaoConfirmada>
              )}
            </>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Progresso</div>
          <ProgressoOF produzidas={progresso.produzidas} total={progresso.total} emProducao={progresso.emProducao} className="mt-3" />
        </div>
        <Stat label="Área" valor={fmtM2(progresso.m2Total, 1)} detalhe={`${fmtM2(progresso.m2Produzidos, 1)} produzidos · ≈ ${fmtKg(pesoTotal)}`} />
        <Stat label="Etiquetas impressas" valor={`${comEtiqueta} / ${chapas.length}`} detalhe={comEtiqueta < chapas.length ? `${chapas.length - comEtiqueta} sem etiqueta` : "Todas etiquetadas"} />
        <Stat
          label="Fecho previsto"
          valor={fmtData(of.dataFechoReal ?? of.dataFechoPrevisto)}
          detalhe={
            ncAbertas > 0 ? (
              <span className="text-red-600">{ncAbertas} não conformidade{ncAbertas === 1 ? "" : "s"} em aberto</span>
            ) : dias === null ? (
              of.dataFechoReal ? "Concluída" : undefined
            ) : dias < 0 ? (
              <span className="text-red-600">{-dias} dias em atraso</span>
            ) : (
              `faltam ${dias} dias`
            )
          }
        />
      </div>

      <section className="mt-6">
        {chapas.length === 0 ? (
          <Vazio
            titulo="Esta OF ainda não tem chapas"
            descricao="Gere as chapas a partir da grelha da fachada: cada uma recebe código, QR Code e posição no layout."
            accao={editavel && <AdicionarLote ofId={of.id} numero={of.numero} zonasExistentes={zonas} />}
          />
        ) : (
          <TabelaChapas ofId={of.id} chapas={chapas} />
        )}
      </section>
    </>
  );
}
