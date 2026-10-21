import { Construction } from "lucide-react";

export function EmConstrucao({ titulo, descricao, sprint }: { titulo: string; descricao: string; sprint: number }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Construction className="size-6 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">{titulo}</h2>
      <p className="text-sm text-muted-foreground text-pretty">{descricao}</p>
      <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">Previsto no Sprint {sprint}</span>
    </div>
  );
}
