import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  titulo,
  descricao,
  voltar,
  accoes,
  children,
}: {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  voltar?: { href: string; label: string };
  accoes?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 space-y-3">
      {voltar && (
        <Link href={voltar.href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          {voltar.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">{titulo}</h2>
          {descricao && <div className="text-sm text-muted-foreground">{descricao}</div>}
        </div>
        {accoes && <div className="flex flex-wrap items-center gap-2">{accoes}</div>}
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, valor, detalhe }: { label: string; valor: React.ReactNode; detalhe?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{valor}</div>
      {detalhe && <div className="mt-0.5 text-xs text-muted-foreground">{detalhe}</div>}
    </div>
  );
}

export function Vazio({ titulo, descricao, accao }: { titulo: string; descricao?: string; accao?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
      <div className="font-medium">{titulo}</div>
      {descricao && <p className="max-w-sm text-sm text-muted-foreground">{descricao}</p>}
      {accao && <div className="mt-2">{accao}</div>}
    </div>
  );
}
