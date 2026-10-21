import { cn } from "@/lib/utils";

/**
 * Nível de stock face ao máximo: verde >50%, âmbar 20–50%, vermelho <20% ou abaixo do mínimo.
 * A marca vertical indica o stock mínimo.
 */
export function BarraStock({ actual, minimo, maximo }: { actual: number; minimo: number; maximo: number | null }) {
  const ref = maximo ?? Math.max(actual, minimo * 2);
  const pct = ref ? Math.min(100, (actual / ref) * 100) : 0;
  const abaixo = actual < minimo;
  const cor = abaixo || pct < 20 ? "bg-red-500" : pct <= 50 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="w-32">
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", cor)} style={{ width: `${Math.max(pct, 2)}%` }} />
        <span className="absolute top-0 h-full w-0.5 bg-foreground/50" style={{ left: `${Math.min(100, (minimo / ref) * 100)}%` }} title="Stock mínimo" />
      </div>
      <div className="mt-1 text-[11px] tabular-nums text-muted-foreground">{Math.round(pct)}% do máximo</div>
    </div>
  );
}
