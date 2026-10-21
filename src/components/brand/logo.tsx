import { cn } from "@/lib/utils";

/** Marca GS ERP — duas torres estilizadas (Torre Dupla) sobre grelha de chapas. */
export function LogoMark({ className, invertido = false }: { className?: string; invertido?: boolean }) {
  const fundo = invertido ? "fill-white" : "fill-primary";
  const torres = invertido ? "fill-neutral-950" : "fill-primary-foreground";
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="7" className={fundo} />
      <g className={torres}>
        <rect x="7" y="9" width="7" height="16" rx="1" />
        <rect x="18" y="5" width="7" height="20" rx="1" />
      </g>
      <g className={fundo} opacity="0.55">
        <rect x="8.5" y="11" width="4" height="2.5" />
        <rect x="8.5" y="15" width="4" height="2.5" />
        <rect x="8.5" y="19" width="4" height="2.5" />
        <rect x="19.5" y="7" width="4" height="2.5" />
        <rect x="19.5" y="11" width="4" height="2.5" />
        <rect x="19.5" y="15" width="4" height="2.5" />
        <rect x="19.5" y="19" width="4" height="2.5" />
      </g>
    </svg>
  );
}

export function Logo({ className, compacto = false }: { className?: string; compacto?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compacto && (
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">GS ERP Industrial</div>
          <div className="text-xs text-muted-foreground">Torre Dupla, Lda.</div>
        </div>
      )}
    </div>
  );
}
