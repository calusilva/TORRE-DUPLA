import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Filtros } from "@/components/comum/filtros";
import { EstadoObraBadge } from "@/components/comum/estado-badges";
import { PageHeader, Vazio } from "@/components/comum/page-header";
import { ProgressoOF } from "@/components/comum/progresso-of";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ESTADOS_OBRA, LABEL_ESTADO_OBRA, type EstadoObra } from "@/lib/dominio";
import { diasAte, fmtData, fmtM2 } from "@/lib/formato";
import { listarObras } from "@/lib/queries";
import { exigirPerfil } from "@/lib/sessao";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Obras" };

export default async function ObrasPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  await exigirPerfil(["admin", "encarregado"]);
  const { q, estado } = await searchParams;
  const lista = await listarObras({
    q,
    estado: ESTADOS_OBRA.includes(estado as EstadoObra) ? (estado as EstadoObra) : undefined,
  });

  return (
    <>
      <PageHeader
        titulo="Obras"
        descricao={`${lista.length} obra${lista.length === 1 ? "" : "s"}`}
        accoes={
          <Button asChild>
            <Link href="/obras/nova">
              <Plus /> Nova obra
            </Link>
          </Button>
        }
      >
        <Filtros
          placeholder="Pesquisar código, nome, cliente…"
          estados={ESTADOS_OBRA.map((e) => ({ valor: e, label: LABEL_ESTADO_OBRA[e] }))}
        />
      </PageHeader>

      {lista.length === 0 ? (
        <Vazio titulo="Nenhuma obra encontrada" descricao="Ajuste os filtros ou crie uma nova obra." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Obra</TableHead>
                <TableHead className="hidden md:table-cell">Cliente</TableHead>
                <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                <TableHead className="hidden text-right lg:table-cell">Área</TableHead>
                <TableHead className="hidden text-right md:table-cell">OFs</TableHead>
                <TableHead className="w-44">Chapas produzidas</TableHead>
                <TableHead className="hidden xl:table-cell">Entrega</TableHead>
                <TableHead className="pr-4">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map(({ obra, nOfs, total, produzidas, emProducao }) => {
                const dias = obra.dataEntregaReal ? null : diasAte(obra.dataEntregaPrevista);
                return (
                  <TableRow key={obra.id} className="relative">
                    <TableCell className="pl-4">
                      <Link href={`/obras/${obra.id}`} className="after:absolute after:inset-0">
                        <div className="font-mono text-xs text-muted-foreground">{obra.codigo}</div>
                        <div className="max-w-72 truncate font-medium">{obra.nome}</div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="max-w-52 truncate">{obra.cliente}</div>
                      <div className="text-xs text-muted-foreground">{obra.localObra}</div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="rounded border px-1.5 py-0.5 font-mono text-xs">{obra.tipoFachada}</span>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums lg:table-cell">{fmtM2(obra.totalM2, 0)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">{nOfs}</TableCell>
                    <TableCell>
                      {total > 0 ? (
                        <ProgressoOF produzidas={produzidas} total={total} emProducao={emProducao} compacto />
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem chapas</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="tabular-nums">{fmtData(obra.dataEntregaReal ?? obra.dataEntregaPrevista)}</div>
                      <div
                        className={cn(
                          "text-xs",
                          dias !== null && dias < 0 ? "text-red-600" : dias !== null && dias <= 14 ? "text-amber-600" : "text-muted-foreground",
                        )}
                      >
                        {obra.dataEntregaReal ? "Entregue" : dias === null ? "" : dias < 0 ? `${-dias} dias em atraso` : `em ${dias} dias`}
                      </div>
                    </TableCell>
                    <TableCell className="pr-4">
                      <EstadoObraBadge estado={obra.estado} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
