import { WifiOff } from "lucide-react";
import type { EstadoLigacao } from "@/lib/use-sse";
import { cn } from "@/lib/utils";

/** Banner de ligação perdida com contagem até à próxima tentativa. */
export function BannerLigacao({ estado, segundos, className }: { estado: EstadoLigacao; segundos: number | null; className?: string }) {
  if (estado !== "a_reconectar") return null;
  return (
    <div role="status" className={cn("flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-900 dark:text-amber-200", className)}>
      <WifiOff className="size-4 shrink-0" />
      Ligação perdida — a reconectar{segundos ? ` em ${segundos} s` : "…"}
    </div>
  );
}
