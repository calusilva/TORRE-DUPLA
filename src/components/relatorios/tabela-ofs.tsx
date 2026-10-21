"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { EstadoOFBadge } from "@/components/comum/estado-badges";
import type { EstadoOF } from "@/lib/dominio";
import { cn } from "@/lib/utils";

export interface LinhaOF {
  id: string;
  numero: string;
  obra: string;
  cliente: string;
  estado: string;
  total: number;
  produzidas: number;
  aprovadas: number;
  rejeitadas: number;
  retrabalho: number;
  produzidas_periodo: number;
}

type Chave = keyof LinhaOF | "pct";
const COLUNAS: { chave: Chave; label: string; num?: boolean }[] = [
  { chave: "numero", label: "OF" },
  { chave: "obra", label: "Obra" },
  { chave: "total", label: "Total", num: true },
  { chave: "produzidas", label: "Produzidas", num: true },
  { chave: "produzidas_periodo", label: "No período", num: true },
  { chave: "aprovadas", label: "Aprovadas QC", num: true },
  { chave: "rejeitadas", label: "Rejeitadas", num: true },
  { chave: "retrabalho", label: "Retrabalho", num: true },
  { chave: "pct", label: "% conclusão", num: true },
  { chave: "estado", label: "Estado" },
];

/** Tabela de OFs ordenável por qualquer coluna (clique no cabeçalho). */
export function TabelaOFs({ linhas }: { linhas: LinhaOF[] }) {
  const [ordem, setOrdem] = useState<{ chave: Chave; asc: boolean }>({ chave: "numero", asc: false });
  const pct = (l: LinhaOF) => (l.total ? (l.produzidas / l.total) * 100 : 0);

  const ordenadas = useMemo(() => {
    const valor = (l: LinhaOF) => (ordem.chave === "pct" ? pct(l) : l[ordem.chave]);
    return [...linhas].sort((a, b) => {
      const va = valor(a);
      const vb = valor(b);
      const r = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt");
      return ordem.asc ? r : -r;
    });
  }, [linhas, ordem]);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
              {COLUNAS.map((c) => {
                const activa = ordem.chave === c.chave;
                const Icone = activa ? (ordem.asc ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th key={c.chave} className={cn("px-3 py-2 font-medium first:pl-4 last:pr-4", c.num ? "text-right" : "text-left")} aria-sort={activa ? (ordem.asc ? "ascending" : "descending") : "none"}>
                    <button
                      type="button"
                      onClick={() => setOrdem((o) => ({ chave: c.chave, asc: o.chave === c.chave ? !o.asc : !c.num }))}
                      className={cn("inline-flex items-center gap-1 hover:text-foreground", activa && "text-foreground")}
                    >
                      {c.label}
                      <Icone className={cn("size-3", !activa && "opacity-40")} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((l) => {
              const p = pct(l);
              return (
                <tr key={l.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="py-2.5 pl-4 pr-3">
                    <Link href={`/of/${l.id}`} className="font-mono font-medium hover:underline">
                      {l.numero}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-mono text-xs text-muted-foreground">{l.obra}</div>
                    <div className="max-w-48 truncate">{l.cliente}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{l.total}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{l.produzidas}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{l.produzidas_periodo}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{l.aprovadas}</td>
                  <td className={cn("px-3 py-2.5 text-right tabular-nums", l.rejeitadas > 0 && "font-semibold text-red-600")}>{l.rejeitadas}</td>
                  <td className={cn("px-3 py-2.5 text-right tabular-nums", l.retrabalho > 0 && "font-semibold text-orange-600")}>{l.retrabalho}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="ml-auto flex w-28 items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", p > 75 ? "bg-green-500" : p >= 25 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${p}%` }} />
                      </div>
                      <span className="w-9 text-right text-xs font-medium tabular-nums">{Math.round(p)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 pl-3 pr-4">
                    <EstadoOFBadge estado={l.estado as EstadoOF} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
