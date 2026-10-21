import { cn } from "@/lib/utils";

/**
 * Barra de progresso de produção: verde >75%, âmbar 25–75%, vermelho <25%,
 * com sub-barra fina das chapas em produção neste momento.
 */
export function ProgressoOF({
  produzidas,
  total,
  emProducao = 0,
  compacto = false,
  className,
}: {
  produzidas: number;
  total: number;
  emProducao?: number;
  compacto?: boolean;
  className?: string;
}) {
  const pct = total ? (produzidas / total) * 100 : 0;
  const pctProd = total ? (emProducao / total) * 100 : 0;
  const cor = pct > 75 ? "bg-green-500" : pct >= 25 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className={cn("min-w-28 space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
        <span className="font-semibold">{Math.round(pct)}%</span>
        <span className="text-muted-foreground">
          {produzidas}/{total}
          {!compacto && emProducao > 0 && <span className="text-amber-600 dark:text-amber-400"> · {emProducao} em prod.</span>}
        </span>
      </div>
      <div className="space-y-0.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn("h-full rounded-full transition-all", cor)} style={{ width: `${pct}%` }} />
        </div>
        {emProducao > 0 && (
          <div className="h-0.5 overflow-hidden rounded-full bg-transparent">
            <div className="h-full rounded-full bg-amber-400" style={{ marginLeft: `${pct}%`, width: `${pctProd}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
