import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { Filtros } from "@/components/comum/filtros";
import { EstadoOFBadge, PrioridadeBadge } from "@/components/comum/estado-badges";
import { PageHeader, Vazio } from "@/components/comum/page-header";
import { ProgressoOF } from "@/components/comum/progresso-of";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { obras } from "@/db/schema";
import { ESTADOS_OF, LABEL_ESTADO_OF, type EstadoOF } from "@/lib/dominio";
import { diasAte, fmtData } from "@/lib/formato";
import { listarOFs } from "@/lib/queries";
import { exigirSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ordens de Fabrico" };

export default async function OFsPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string; obra?: string }> }) {
  const user = await exigirSessao();
  const podeCriar = user.perfil === "admin" || user.perfil === "encarregado";
  const { q, estado, obra } = await searchParams;

  const [lista, listaObras] = await Promise.all([
    listarOFs({
      q,
      estado: ESTADOS_OF.includes(estado as EstadoOF) ? (estado as EstadoOF) : undefined,
      obraId: obra && /^[0-9a-f-]{36}$/.test(obra) ? obra : undefined,
    }),
    db.select({ id: obras.id, codigo: obras.codigo, nome: obras.nome }).from(obras).orderBy(asc(obras.codigo)),
  ]);

  return (
    <>
      <PageHeader
        titulo="Ordens de Fabrico"
        descricao={`${lista.length} OF${lista.length === 1 ? "" : "s"} · ${lista.reduce((s, l) => s + l.total, 0)} chapas`}
        accoes={
          podeCriar && (
            <Button asChild>
              <Link href="/of/nova">
                <Plus /> Nova OF
              </Link>
            </Button>
          )
        }
      >
        <Filtros
          placeholder="Pesquisar OF, descrição, cliente…"
          estados={ESTADOS_OF.map((e) => ({ valor: e, label: LABEL_ESTADO_OF[e] }))}
          extra={{ param: "obra", label: "Todas as obras", opcoes: listaObras.map((o) => ({ valor: o.id, label: `${o.codigo} · ${o.nome}` })) }}
        />
      </PageHeader>

      {lista.length === 0 ? (
        <Vazio titulo="Nenhuma OF encontrada" descricao="Ajuste os filtros ou crie uma nova OF." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">OF</TableHead>
                <TableHead className="hidden md:table-cell">Obra</TableHead>
                <TableHead className="hidden lg:table-cell">Zona</TableHead>
                <TableHead className="hidden sm:table-cell">Prioridade</TableHead>
                <TableHead className="w-52">Progresso</TableHead>
                <TableHead className="hidden xl:table-cell">Fecho previsto</TableHead>
                <TableHead className="pr-4">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map(({ of, obra, responsavel, total, produzidas, emProducao }) => {
                const activa = of.estado !== "concluida" && of.estado !== "cancelada";
                const dias = activa ? diasAte(of.dataFechoPrevisto) : null;
                return (
                  <TableRow key={of.id} className="relative">
                    <TableCell className="pl-4">
                      <Link href={`/of/${of.id}`} className="after:absolute after:inset-0">
                        <div className="font-mono text-sm font-medium">{of.numero}</div>
                        <div className="max-w-80 truncate text-xs text-muted-foreground">{of.descricao}</div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="max-w-56 truncate">{obra.cliente}</div>
                      <div className="font-mono text-xs text-muted-foreground">{obra.codigo}</div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div>{of.zona}</div>
                      {responsavel && <div className="text-xs text-muted-foreground">{responsavel}</div>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <PrioridadeBadge prioridade={of.prioridade} />
                    </TableCell>
                    <TableCell>
                      {total > 0 ? <ProgressoOF produzidas={produzidas} total={total} emProducao={emProducao} /> : <span className="text-xs text-muted-foreground">Sem chapas</span>}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="tabular-nums">{fmtData(of.dataFechoPrevisto)}</div>
                      {dias !== null && (
                        <div className={cn("text-xs", dias < 0 ? "text-red-600" : dias <= 7 ? "text-amber-600" : "text-muted-foreground")}>
                          {dias < 0 ? `${-dias} dias em atraso` : dias === 0 ? "hoje" : `em ${dias} dias`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      <EstadoOFBadge estado={of.estado} />
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
