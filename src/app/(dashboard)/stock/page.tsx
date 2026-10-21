import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Link2 } from "lucide-react";
import { PageHeader, Stat } from "@/components/comum/page-header";
import { BarraStock } from "@/components/stock/barra-stock";
import { FiltrosMovimentos } from "@/components/stock/filtros-movimentos";
import { MovimentoDialog } from "@/components/stock/movimento-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LABEL_TIPO_MOVIMENTO, LABEL_UNIDADE, PERFIS_MOVIMENTO_STOCK, TIPOS_MOVIMENTO, type TipoMovimento, type UnidadeMaterial } from "@/lib/dominio";
import { fmtDataHora, fmtEuro, fmtInt, fmtQtd } from "@/lib/formato";
import { consumoMes, consumosPorOF, listarMateriais, listarMovimentos } from "@/lib/consultas/stock";
import { exigirSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Stock de materiais" };

const TABS = [
  { id: "materiais", label: "Materiais" },
  { id: "movimentos", label: "Movimentos" },
  { id: "consumos", label: "Consumos por OF" },
] as const;

const COR_TIPO: Record<TipoMovimento, string> = {
  entrada: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  saida: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  ajuste: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  reserva: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

export default async function StockPage({ searchParams }: { searchParams: Promise<{ tab?: string; material?: string; tipo?: string }> }) {
  const user = await exigirSessao();
  const podeMovimentar = PERFIS_MOVIMENTO_STOCK.includes(user.perfil);
  const sp = await searchParams;
  const tab = TABS.some((t) => t.id === sp.tab) ? sp.tab! : "materiais";

  const [lista, consumo] = await Promise.all([listarMateriais(), consumoMes()]);
  const abaixo = lista.filter((m) => m.actual < m.minimo);
  const valor = lista.reduce((s, m) => s + m.actual * m.preco, 0);
  const ordemUn: UnidadeMaterial[] = ["kg", "m2", "ml", "un"];
  const textoConsumo = ordemUn
    .map((u) => consumo.find((c) => c.unidade === u))
    .filter((c): c is { unidade: UnidadeMaterial; total: number } => !!c && c.total > 0)
    .map((c) => fmtQtd(c.total, c.unidade))
    .join(" · ");

  return (
    <>
      <PageHeader titulo="Stock de materiais" descricao="Matérias-primas e consumíveis da produção de fachadas." />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
        <Link2 className="mt-0.5 size-4 shrink-0" />
        <p>
          <strong className="font-medium">Integração com Primavera ERP disponível</strong> — sincronização automática de entradas e saídas de stock.
          <span className="text-sky-800/70 dark:text-sky-200/70"> Nesta demonstração os valores são simulados.</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Referências" valor={lista.length} detalhe="materiais geridos" />
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Abaixo do mínimo</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-semibold tabular-nums tracking-tight">{abaixo.length}</span>
            {abaixo.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                <AlertTriangle className="size-3" /> Encomendar
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{abaixo.length ? abaixo.map((m) => m.codigo).join(", ") : "Todos os níveis acima do mínimo"}</div>
        </div>
        <Stat label="Valor em stock" valor={fmtEuro(valor)} detalhe="a preço médio de compra" />
        <Stat label="Consumo este mês" valor={<span className="text-base font-medium leading-snug">{textoConsumo || "—"}</span>} detalhe="saídas para produção" />
      </div>

      <nav className="mb-4 mt-6 flex gap-1 border-b" aria-label="Secções do stock">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/stock${t.id === "materiais" ? "" : `?tab=${t.id}`}`}
            scroll={false}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
            aria-current={tab === t.id ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "materiais" && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Material</TableHead>
                <TableHead>Un.</TableHead>
                <TableHead className="text-right">Stock actual</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Máximo</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead className="text-right">Reservado</TableHead>
                <TableHead className="text-right">Disponível</TableHead>
                {podeMovimentar && <TableHead className="pr-4" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((m) => {
                const baixo = m.actual < m.minimo;
                return (
                  <TableRow key={m.id} className={cn(baixo && "bg-red-50/60 hover:bg-red-50 dark:bg-red-500/5")}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{m.codigo}</span>
                        {baixo && (
                          <span className="inline-flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                            <AlertTriangle className="size-3" /> Abaixo do mínimo
                          </span>
                        )}
                      </div>
                      <div className="font-medium">{m.nome}</div>
                      {m.fornecedor && <div className="text-xs text-muted-foreground">{m.fornecedor}</div>}
                    </TableCell>
                    <TableCell>{LABEL_UNIDADE[m.unidade]}</TableCell>
                    <TableCell className={cn("text-right font-semibold tabular-nums", baixo && "text-red-600")}>{fmtInt(m.actual)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmtInt(m.minimo)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{m.maximo ? fmtInt(m.maximo) : "—"}</TableCell>
                    <TableCell>
                      <BarraStock actual={m.actual} minimo={m.minimo} maximo={m.maximo} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.reservado ? fmtQtd(m.reservado, m.unidade) : "—"}</TableCell>
                    <TableCell className={cn("text-right font-medium tabular-nums", m.disponivel < m.minimo && "text-red-600")}>{fmtQtd(m.disponivel, m.unidade)}</TableCell>
                    {podeMovimentar && (
                      <TableCell className="pr-4 text-right">
                        <MovimentoDialog material={{ id: m.id, codigo: m.codigo, nome: m.nome, unidade: m.unidade, actual: m.actual, fornecedor: m.fornecedor }} />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="border-t px-4 py-2 text-xs text-muted-foreground">
            Reservado = consumo teórico das chapas por produzir em OFs activas. Disponível = stock actual − reservado.
          </p>
        </div>
      )}

      {tab === "movimentos" && <Movimentos materialId={sp.material} tipo={sp.tipo} materiais={lista} />}
      {tab === "consumos" && <Consumos />}
    </>
  );
}

async function Movimentos({ materialId, tipo, materiais }: { materialId?: string; tipo?: string; materiais: { id: string; codigo: string; nome: string }[] }) {
  const movs = await listarMovimentos({
    materialId: materiais.some((m) => m.id === materialId) ? materialId : undefined,
    tipo: TIPOS_MOVIMENTO.includes(tipo as TipoMovimento) ? (tipo as TipoMovimento) : undefined,
  });
  return (
    <div className="space-y-3">
      <FiltrosMovimentos materiais={materiais} />
      {movs.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">Sem movimentos registados.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Data</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Stock resultante</TableHead>
                <TableHead className="pr-4">Motivo / OF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movs.map((m) => {
                const q = Number(m.quantidade);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap pl-4 tabular-nums text-muted-foreground">{fmtDataHora(m.data)}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{m.materialCodigo}</span> {m.materialNome}
                    </TableCell>
                    <TableCell>
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", COR_TIPO[m.tipo])}>{LABEL_TIPO_MOVIMENTO[m.tipo]}</span>
                    </TableCell>
                    <TableCell className={cn("whitespace-nowrap text-right font-medium tabular-nums", q >= 0 ? "text-green-700 dark:text-green-400" : "text-foreground")}>
                      {q >= 0 ? "+" : "−"}
                      {fmtQtd(Math.abs(q), m.unidade)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">{fmtQtd(m.quantidadeNova, m.unidade)}</TableCell>
                    <TableCell className="pr-4">
                      <div className="max-w-80 truncate">{m.motivo}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.numeroOf && (
                          <Link href={`/of/${m.ofId}`} className="font-mono hover:underline">
                            {m.numeroOf}
                          </Link>
                        )}
                        {m.fornecedor && <span>{m.fornecedor}</span>}
                        {m.utilizador && <span> · {m.utilizador}</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {movs.length === 300 && <p className="border-t px-4 py-2 text-xs text-muted-foreground">A mostrar os 300 movimentos mais recentes.</p>}
        </div>
      )}
    </div>
  );
}

async function Consumos() {
  const ofs = await consumosPorOF();
  if (!ofs.length) return <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">Sem OFs activas.</div>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Consumo teórico por chapa: alumínio = m² × espessura × 2,7 kg · isolamento = m² · perfis = perímetro × 1,2 · EPDM = perímetro · fixações = 8 por chapa · tinta = 0,12 kg/m².
      </p>
      {ofs.map((of) => (
        <section key={of.id} className="overflow-hidden rounded-xl border bg-card">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
            <div>
              <Link href={`/of/${of.id}`} className="font-mono font-semibold hover:underline">
                {of.numero}
              </Link>{" "}
              <span className="text-sm text-muted-foreground">
                {of.cliente} · {of.descricao}
              </span>
            </div>
            <span className="text-sm tabular-nums text-muted-foreground">
              {of.iniciadas}/{of.chapas} chapas iniciadas
            </span>
          </header>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Material</TableHead>
                <TableHead className="text-right">Total da OF</TableHead>
                <TableHead className="text-right">Consumido</TableHead>
                <TableHead className="text-right">Por consumir</TableHead>
                <TableHead className="pr-4 text-right">Stock actual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {of.linhas.map((l) => (
                <TableRow key={l.codigo}>
                  <TableCell className="pl-4">
                    <span className="font-mono text-xs text-muted-foreground">{l.codigo}</span> {l.nome}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtQtd(l.total, l.unidade)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{fmtQtd(l.consumido, l.unidade)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{fmtQtd(l.porConsumir, l.unidade)}</TableCell>
                  <TableCell className={cn("pr-4 text-right tabular-nums", l.stock < l.porConsumir && "font-semibold text-red-600")}>{fmtQtd(l.stock, l.unidade)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ))}
    </div>
  );
}
