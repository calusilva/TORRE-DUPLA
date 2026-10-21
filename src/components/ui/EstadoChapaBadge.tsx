import { cn } from "@/lib/utils";
import { CORES_ESTADO, LABEL_ESTADO_CHAPA, type EstadoChapa } from "@/lib/dominio";

/** Badge de estado da chapa — o ponto usa exactamente a cor do layout visual. */
export function EstadoChapaBadge({ estado, className, grande = false }: { estado: EstadoChapa; className?: string; grande?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-background font-medium",
        grande ? "h-7 px-3 text-sm" : "h-5.5 px-2 text-xs",
        className,
      )}
    >
      <span className="relative flex size-2">
        {estado === "em_producao" && (
          <span className="absolute inline-flex size-full animate-ping rounded-full opacity-75" style={{ backgroundColor: CORES_ESTADO[estado] }} />
        )}
        <span
          className="relative inline-flex size-2 rounded-full ring-1 ring-black/10 dark:ring-white/15"
          style={{ backgroundColor: CORES_ESTADO[estado] }}
        />
      </span>
      {LABEL_ESTADO_CHAPA[estado]}
    </span>
  );
}
