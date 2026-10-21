"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertTriangle, Printer, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EstadoChapaBadge } from "@/components/ui/EstadoChapaBadge";
import { Input } from "@/components/ui/input";
import { CORES_ESTADO, ESTADOS_CHAPA, LABEL_ESTADO_CHAPA, type EstadoChapa } from "@/lib/dominio";
import { fmtDimensoes, fmtM2 } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { ImprimirEtiquetas } from "./imprimir-etiquetas";

export interface LinhaChapa {
  id: string;
  codigo: string;
  estado: EstadoChapa;
  zona: string | null;
  piso: number | null;
  coluna: string | null;
  largura: string;
  altura: string;
  m2: string;
  material: string | null;
  temNaoConformidade: boolean;
  operador: string | null;
  etiquetas: number;
}

const LIMIAR_VIRTUALIZACAO = 200;
const ALTURA_LINHA = 52;
const COLUNAS = "grid-cols-[2.25rem_minmax(11rem,1.4fr)_minmax(8rem,1fr)_minmax(9rem,1fr)_6rem_minmax(8rem,1fr)_8.5rem]";

export function TabelaChapas({ ofId, chapas }: { ofId: string; chapas: LinhaChapa[] }) {
  const [q, setQ] = useState("");
  const [estados, setEstados] = useState<Set<EstadoChapa>>(new Set());
  const [zona, setZona] = useState<string | null>(null);
  const [seleccao, setSeleccao] = useState<Set<string>>(new Set());

  const zonas = useMemo(() => [...new Set(chapas.map((c) => c.zona ?? "—"))], [chapas]);
  const contagem = useMemo(() => {
    const m = new Map<EstadoChapa, number>();
    for (const c of chapas) m.set(c.estado, (m.get(c.estado) ?? 0) + 1);
    return m;
  }, [chapas]);

  const filtradas = useMemo(() => {
    const termo = q.trim().toUpperCase();
    return chapas.filter(
      (c) =>
        (!estados.size || estados.has(c.estado)) &&
        (!zona || (c.zona ?? "—") === zona) &&
        (!termo || c.codigo.includes(termo) || `${c.coluna}${c.piso}`.toUpperCase().includes(termo)),
    );
  }, [chapas, q, estados, zona]);

  const todasSeleccionadas = filtradas.length > 0 && filtradas.every((c) => seleccao.has(c.id));
  const algumas = !todasSeleccionadas && filtradas.some((c) => seleccao.has(c.id));

  function alternarTodas() {
    setSeleccao((s) => {
      const n = new Set(s);
      for (const c of filtradas) {
        if (todasSeleccionadas) n.delete(c.id);
        else n.add(c.id);
      }
      return n;
    });
  }
  function alternar(id: string) {
    setSeleccao((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function alternarEstado(e: EstadoChapa) {
    setEstados((s) => {
      const n = new Set(s);
      if (n.has(e)) n.delete(e);
      else n.add(e);
      return n;
    });
  }

  const porProduzir = chapas.filter((c) => c.estado === "por_produzir");
  const grupos = [
    { id: "seleccao", label: "Chapas seleccionadas", ids: [...seleccao] },
    { id: "sem_etiqueta", label: "Por produzir sem etiqueta", ids: porProduzir.filter((c) => c.etiquetas === 0).map((c) => c.id) },
    { id: "por_produzir", label: "Todas por produzir", ids: porProduzir.map((c) => c.id) },
    { id: "filtradas", label: "Chapas visíveis (filtro actual)", ids: filtradas.map((c) => c.id) },
    { id: "todas", label: "Todas as chapas da OF", ids: chapas.map((c) => c.id) },
  ];

  return (
    <div className="space-y-3">
      {/* Filtros por estado */}
      <div className="flex flex-wrap gap-1.5">
        {ESTADOS_CHAPA.filter((e) => contagem.get(e)).map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => alternarEstado(e)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors hover:bg-muted",
              estados.has(e) && "border-foreground/40 bg-muted font-medium",
            )}
          >
            <span className="size-2 rounded-full ring-1 ring-black/10" style={{ backgroundColor: CORES_ESTADO[e] }} />
            {LABEL_ESTADO_CHAPA[e]}
            <span className="tabular-nums text-muted-foreground">{contagem.get(e)}</span>
          </button>
        ))}
        {estados.size > 0 && (
          <button type="button" onClick={() => setEstados(new Set())} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
            Limpar
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código ou posição (ex.: C4)" className="h-9 pl-8" />
        </div>
        {zonas.length > 1 && (
          <div className="flex gap-1 rounded-lg border p-0.5">
            {[null, ...zonas].map((z) => (
              <button
                key={z ?? "todas"}
                type="button"
                onClick={() => setZona(z)}
                className={cn("h-7 rounded-md px-2.5 text-xs", zona === z ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}
              >
                {z ?? "Todas as zonas"}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {seleccao.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground tabular-nums">{seleccao.size} seleccionada{seleccao.size === 1 ? "" : "s"}</span>
              <Button variant="ghost" size="sm" onClick={() => setSeleccao(new Set())}>
                Limpar
              </Button>
            </>
          )}
          <ImprimirEtiquetas
            key={seleccao.size ? "s" : "n"}
            grupos={grupos}
            grupoInicial={seleccao.size ? "seleccao" : undefined}
            trigger={
              <Button variant={seleccao.size ? "default" : "outline"} size="sm">
                <Printer /> {seleccao.size ? `Etiquetas (${seleccao.size})` : "Etiquetas"}
              </Button>
            }
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <div className="min-w-[56rem]">
            <div className={cn("grid items-center gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground", COLUNAS)}>
              <Checkbox checked={todasSeleccionadas ? true : algumas ? "indeterminate" : false} onCheckedChange={alternarTodas} aria-label="Seleccionar todas" />
              <div>Código</div>
              <div>Posição</div>
              <div>Dimensões</div>
              <div className="text-right">Área</div>
              <div>Operador</div>
              <div>Estado</div>
            </div>
            {filtradas.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma chapa corresponde aos filtros.</div>
            ) : filtradas.length > LIMIAR_VIRTUALIZACAO ? (
              <ListaVirtual chapas={filtradas} ofId={ofId} seleccao={seleccao} alternar={alternar} />
            ) : (
              filtradas.map((c) => <Linha key={c.id} c={c} ofId={ofId} seleccionada={seleccao.has(c.id)} alternar={alternar} />)
            )}
          </div>
        </div>
        <div className="border-t px-4 py-2 text-xs text-muted-foreground tabular-nums">
          {filtradas.length === chapas.length ? `${chapas.length} chapas` : `${filtradas.length} de ${chapas.length} chapas`}
          {filtradas.length > LIMIAR_VIRTUALIZACAO && " · lista virtualizada"}
        </div>
      </div>
    </div>
  );
}

function ListaVirtual({ chapas, ofId, seleccao, alternar }: { chapas: LinhaChapa[]; ofId: string; seleccao: Set<string>; alternar: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({ count: chapas.length, getScrollElement: () => ref.current, estimateSize: () => ALTURA_LINHA, overscan: 12 });
  return (
    <div ref={ref} className="max-h-[36rem] overflow-y-auto">
      <div style={{ height: v.getTotalSize(), position: "relative" }}>
        {v.getVirtualItems().map((item) => {
          const c = chapas[item.index];
          return (
            <div key={c.id} style={{ position: "absolute", top: 0, left: 0, right: 0, height: item.size, transform: `translateY(${item.start}px)` }}>
              <Linha c={c} ofId={ofId} seleccionada={seleccao.has(c.id)} alternar={alternar} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Linha({ c, ofId, seleccionada, alternar }: { c: LinhaChapa; ofId: string; seleccionada: boolean; alternar: (id: string) => void }) {
  return (
    <div
      className={cn("relative grid items-center gap-3 border-b px-4 text-sm last:border-0 hover:bg-muted/50", COLUNAS, seleccionada && "bg-muted/60")}
      style={{ height: ALTURA_LINHA }}
    >
      <Checkbox checked={seleccionada} onCheckedChange={() => alternar(c.id)} className="relative z-10" aria-label={`Seleccionar ${c.codigo}`} />
      <Link href={`/of/${ofId}/chapas/${c.id}`} className="flex items-center gap-1.5 font-mono text-[13px] font-medium after:absolute after:inset-0">
        {c.codigo}
        {c.temNaoConformidade && <AlertTriangle className="size-3.5 text-red-500" aria-label="Com não conformidade" />}
        {c.etiquetas > 0 && <Tag className="size-3 text-muted-foreground" aria-label={`${c.etiquetas} etiqueta(s) impressa(s)`} />}
      </Link>
      <div className="truncate">
        {c.zona} <span className="text-muted-foreground">· P{c.piso} · {c.coluna}</span>
      </div>
      <div className="truncate tabular-nums">{fmtDimensoes(c.largura, c.altura)}</div>
      <div className="text-right tabular-nums">{fmtM2(c.m2)}</div>
      <div className="truncate text-muted-foreground">{c.operador ?? "—"}</div>
      <div>
        <EstadoChapaBadge estado={c.estado} />
      </div>
    </div>
  );
}
