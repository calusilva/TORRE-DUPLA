import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Campo de formulário com label, ajuda e erro. */
export function Campo({
  id,
  label,
  erro,
  ajuda,
  obrigatorio,
  className,
  children,
}: {
  id: string;
  label: string;
  erro?: string;
  ajuda?: React.ReactNode;
  obrigatorio?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {obrigatorio && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {erro ? (
        <p className="text-xs text-destructive" role="alert">
          {erro}
        </p>
      ) : (
        ajuda && <p className="text-xs text-muted-foreground">{ajuda}</p>
      )}
    </div>
  );
}

export function SeccaoForm({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-b py-8 first:pt-0 last:border-0 md:grid-cols-[minmax(0,15rem)_1fr]">
      <div className="space-y-1">
        <h3 className="font-medium">{titulo}</h3>
        {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
