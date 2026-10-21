import { Skeleton } from "@/components/ui/skeleton";

export function EsqueletoCabecalho() {
  return (
    <div className="mb-6 space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
  );
}

export function EsqueletoStats({ n = 4 }: { n?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="space-y-2 rounded-xl border bg-card p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

/** Tabela placeholder (linhas a cinzento) enquanto os dados carregam. */
export function EsqueletoTabela({ linhas = 5, colunas = 6 }: { linhas?: number; colunas?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card" aria-busy="true" aria-label="A carregar">
      <div className="flex gap-6 border-b bg-muted/40 px-4 py-3">
        {Array.from({ length: colunas }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: linhas }, (_, r) => (
        <div key={r} className="flex items-center gap-6 border-b px-4 py-4 last:border-0">
          {Array.from({ length: colunas }, (_, i) => (
            <Skeleton key={i} className="h-4 flex-1" style={{ opacity: 1 - r * 0.12 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Fachada placeholder — grelha de chapas a cinzento, sem "flash" de SVG vazio. */
export function EsqueletoFachada() {
  return (
    <div className="flex h-[62svh] min-h-[420px] items-center justify-center rounded-xl border bg-card p-8" aria-busy="true" aria-label="A carregar layout">
      <div className="grid w-full max-w-3xl grid-cols-10 gap-1 opacity-70">
        {Array.from({ length: 60 }, (_, i) => (
          <Skeleton key={i} className="h-8 rounded-sm" style={{ animationDelay: `${(i % 10) * 60}ms` }} />
        ))}
      </div>
    </div>
  );
}
