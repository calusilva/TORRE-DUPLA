"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, Timer } from "lucide-react";
import { CORES_ESTADO, LABEL_ESTADO_CHAPA, LIMITE_MINUTOS_PRODUCAO } from "@/lib/dominio";
import { fmtDimensoes, fmtDuracao, fmtM2, minutosEntre } from "@/lib/formato";
import type { ChapaScan } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Chapa = NonNullable<ChapaScan>;

/** Minutos desde `desde`, actualizado a cada 15 s. */
export function useMinutosDecorridos(desde: Date | string | null | undefined) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!desde) return;
    const t = setInterval(() => setAgora(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [desde]);
  return desde ? minutosEntre(desde, new Date(agora)) : null;
}

/** Ficha resumida da chapa lida (cabeçalho do ecrã de scan). */
export function CartaoChapa({ chapa }: { chapa: Chapa }) {
  const minutos = useMinutosDecorridos(chapa.estado === "em_producao" || chapa.estado === "em_retrabalho" ? chapa.dataInicioProd : null);
  const excedido = chapa.estado === "em_producao" && minutos !== null && minutos > LIMITE_MINUTOS_PRODUCAO;
  const cor = CORES_ESTADO[chapa.estado];

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="space-y-1.5 p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="font-mono text-2xl font-bold tracking-tight">{chapa.codigo}</div>
          <Link href={`/of/${chapa.ofId}/chapas/${chapa.id}`} className="mt-1 text-muted-foreground hover:text-foreground" aria-label="Abrir ficha completa">
            <ExternalLink className="size-5" />
          </Link>
        </div>
        <div className="text-sm">
          <span className="font-mono">{chapa.numeroOf}</span> <span className="text-muted-foreground">|</span> {chapa.cliente}
        </div>
        <div className="text-sm">
          {chapa.zona} <span className="text-muted-foreground">|</span> Piso {chapa.piso} <span className="text-muted-foreground">|</span> Col. {chapa.coluna}
        </div>
        <div className="text-sm text-muted-foreground">
          {fmtDimensoes(chapa.largura, chapa.altura)} · {fmtM2(chapa.m2)} · {chapa.material}
        </div>
      </div>

      {/* Faixa de estado com a cor do layout */}
      <div className="flex items-center justify-between gap-3 border-t px-4 py-3" style={{ backgroundColor: `${cor}33`, borderTopColor: cor }}>
        <div className="flex items-center gap-2.5">
          <span className={cn("size-4 rounded-full ring-2 ring-black/10", chapa.estado === "em_producao" && "animate-pulse")} style={{ backgroundColor: cor }} />
          <span className="text-lg font-bold uppercase tracking-wide">{LABEL_ESTADO_CHAPA[chapa.estado]}</span>
        </div>
        {minutos !== null && (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums", excedido ? "bg-red-600 text-white" : "bg-background/80")}>
            <Timer className="size-4" />
            há {fmtDuracao(minutos)}
          </span>
        )}
      </div>
      {(chapa.operador || chapa.ncAbertas > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-sm">
          {chapa.operador && <span className="text-muted-foreground">Operador: {chapa.operador}</span>}
          {chapa.ncAbertas > 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-red-600">
              <AlertTriangle className="size-4" /> {chapa.ncAbertas} NC em aberto
            </span>
          )}
        </div>
      )}
    </div>
  );
}
