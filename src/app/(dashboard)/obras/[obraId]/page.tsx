import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LayoutGrid, Pencil, Plus, Trash2 } from "lucide-react";
import { eliminarObra } from "@/app/actions/obras";
import { AccaoConfirmada } from "@/components/comum/accao-confirmada";
import { EstadoObraBadge, EstadoOFBadge, PrioridadeBadge } from "@/components/comum/estado-badges";
import { PageHeader, Stat, Vazio } from "@/components/comum/page-header";
import { ProgressoOF } from "@/components/comum/progresso-of";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { diasAte, fmtData, fmtM2 } from "@/lib/formato";
import { listarOFs, obterObra, progressoPorZona } from "@/lib/queries";
import { exigirPerfil } from "@/lib/sessao";

type Params = { params: Promise<{ obraId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { obraId } = await params;
  const d = await obterObra(obraId).catch(() => null);
  return { title: d ? `${d.obra.codigo} — ${d.obra.nome}` : "Obra" };
}

export default async function ObraPage({ params }: Params) {
  await exigirPerfil(["admin", "encarregado"]);
  const { obraId } = await params;
  const dados = await obterObra(obraId).catch(() => null);
  if (!dados) notFound();
  const { obra, encarregado } = dados;

  const [ofs, zonas] = await Promise.all([listarOFs({ obraId }), progressoPorZona(obraId)]);
  const total = zonas.reduce((s, z) => s + z.total, 0);
  const produzidas = zonas.reduce((s, z) => s + z.produzidas, 0);
  const m2Gerados = zonas.reduce((s, z) => s + z.m2Total, 0);
  const m2Produzidos = zonas.reduce((s, z) => s + z.m2Produzidos, 0);
  const dias = obra.dataEntregaReal ? null : diasAte(obra.dataEntregaPrevista);

  return (
    <>
      <PageHeader
        voltar={{ href: "/obras", label: "Obras" }}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            {obra.nome}
            <EstadoObraBadge estado={obra.estado} />
          </span>
        }
        descricao={
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="font-mono">{obra.codigo}</span>
            <span>{obra.cliente}</span>
            {obra.localObra && <span>{obra.localObra}</span>}
            <span>Fachada {obra.tipoFachada}</span>
            {encarregado && <span>Encarregado: {encarregado}</span>}
          </span>
        }
        accoes={
          <>
            <Button variant="outline" asChild>
              <Link href={`/obras/${obra.id}/layout-visual`}>
                <LayoutGrid /> Layout visual
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/obras/${obra.id}/editar`}>
                <Pencil /> Editar
              </Link>
            </Button>
            {ofs.length === 0 && (
              <AccaoConfirmada
                accao={eliminarObra.bind(null, obra.id)}
                redirecionar="/obras"
                variant="destructive"
                confirmacao={{
                  titulo: `Eliminar ${obra.codigo}?`,
                  descricao: "A obra será eliminada definitivamente. Esta operação não pode ser anulada.",
                  botao: "Eliminar",
                  destrutiva: true,
                }}
              >
                <Trash2 /> Eliminar
              </AccaoConfirmada>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Área contratada" valor={fmtM2(obra.totalM2, 0)} detalhe={`${fmtM2(m2Gerados, 1)} já em OF`} />
        <Stat label="Chapas" valor={`${produzidas} / ${total}`} detalhe={total ? `${Math.round((produzidas / total) * 100)}% produzidas` : "Sem chapas geradas"} />
        <Stat label="Área produzida" valor={fmtM2(m2Produzidos, 1)} detalhe={m2Gerados ? `${Math.round((m2Produzidos / m2Gerados) * 100)}% da área em OF` : "—"} />
        <Stat
          label={obra.dataEntregaReal ? "Entregue em" : "Entrega prevista"}
          valor={fmtData(obra.dataEntregaReal ?? obra.dataEntregaPrevista)}
          detalhe={dias === null ? undefined : dias < 0 ? <span className="text-red-600">{-dias} dias em atraso</span> : `faltam ${dias} dias`}
        />
      </div>

      {zonas.length > 0 && (
        <section className="mt-6 rounded-xl border bg-card p-4">
          <h3 className="mb-4 text-sm font-medium">Progresso por zona</h3>
          <div className="space-y-3">
            {zonas.map((z) => (
              <div key={z.zona} className="grid items-center gap-2 sm:grid-cols-[10rem_1fr]">
                <div className="text-sm">{z.zona}</div>
                <ProgressoOF produzidas={z.produzidas} total={z.total} emProducao={z.emProducao} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Ordens de fabrico</h3>
          <Button size="sm" asChild>
            <Link href={`/of/nova?obraId=${obra.id}`}>
              <Plus /> Nova OF
            </Link>
          </Button>
        </div>
        {ofs.length === 0 ? (
          <Vazio titulo="Sem OFs" descricao="Crie a primeira OF desta obra e gere as chapas a partir da grelha da fachada." />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">OF</TableHead>
                  <TableHead className="hidden md:table-cell">Zona</TableHead>
                  <TableHead className="hidden lg:table-cell">Responsável</TableHead>
                  <TableHead className="hidden sm:table-cell">Prioridade</TableHead>
                  <TableHead className="w-52">Progresso</TableHead>
                  <TableHead className="pr-4">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ofs.map(({ of, responsavel, total, produzidas, emProducao }) => (
                  <TableRow key={of.id} className="relative">
                    <TableCell className="pl-4">
                      <Link href={`/of/${of.id}`} className="after:absolute after:inset-0">
                        <div className="font-mono text-sm font-medium">{of.numero}</div>
                        <div className="max-w-80 truncate text-xs text-muted-foreground">{of.descricao}</div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{of.zona}</TableCell>
                    <TableCell className="hidden lg:table-cell">{responsavel ?? "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <PrioridadeBadge prioridade={of.prioridade} />
                    </TableCell>
                    <TableCell>
                      <ProgressoOF produzidas={produzidas} total={total} emProducao={emProducao} />
                    </TableCell>
                    <TableCell className="pr-4">
                      <EstadoOFBadge estado={of.estado} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {obra.observacoes && (
        <section className="mt-6 rounded-xl border bg-card p-4">
          <h3 className="mb-1 text-sm font-medium">Observações</h3>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{obra.observacoes}</p>
        </section>
      )}
    </>
  );
}
