import { cn } from "@/lib/utils";
import { LABEL_ESTADO_OBRA, LABEL_ESTADO_OF, PRIORIDADES, type EstadoObra, type EstadoOF } from "@/lib/dominio";

const base = "inline-flex h-5.5 items-center whitespace-nowrap rounded-md px-2 text-xs font-medium";

const COR_OF: Record<EstadoOF, string> = {
  em_espera: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  em_producao: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  suspensa: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  concluida: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  cancelada: "bg-red-100 text-red-800 line-through dark:bg-red-500/15 dark:text-red-300",
};

const COR_OBRA: Record<EstadoObra, string> = {
  planeamento: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  em_producao: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  concluida: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  expedida: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
};

export function EstadoOFBadge({ estado }: { estado: EstadoOF }) {
  return <span className={cn(base, COR_OF[estado])}>{LABEL_ESTADO_OF[estado]}</span>;
}

export function EstadoObraBadge({ estado }: { estado: EstadoObra }) {
  return <span className={cn(base, COR_OBRA[estado])}>{LABEL_ESTADO_OBRA[estado]}</span>;
}

export function PrioridadeBadge({ prioridade }: { prioridade: number }) {
  const label = PRIORIDADES[prioridade as 1 | 2 | 3] ?? "Normal";
  return (
    <span
      className={cn(
        base,
        prioridade === 1 && "bg-red-600 text-white",
        prioridade === 2 && "border text-muted-foreground",
        prioridade === 3 && "text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
