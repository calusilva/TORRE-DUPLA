"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PERIODOS = [
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mês" },
  { id: "personalizado", label: "Intervalo" },
] as const;

export function FiltrosRelatorio({
  periodo,
  de,
  ate,
  obras,
  ofs,
}: {
  periodo: string;
  de: string;
  ate: string;
  obras: { id: string; codigo: string; nome: string }[];
  ofs: { id: string; numero: string; obraId: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendente, startTransition] = useTransition();
  const [deLocal, setDe] = useState(de);
  const [ateLocal, setAte] = useState(ate);
  const obra = params.get("obra") ?? "todas";
  const of = params.get("of") ?? "todas";

  function navegar(alteracoes: Record<string, string | null>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(alteracoes)) {
      if (v === null || v === "todas") p.delete(k);
      else p.set(k, v);
    }
    startTransition(() => router.replace(`${pathname}?${p}`, { scroll: false }));
  }

  const ofsDaObra = ofs.filter((o) => obra === "todas" || o.obraId === obra);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border p-0.5" role="group" aria-label="Período">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => navegar(p.id === "personalizado" ? { periodo: p.id, de: deLocal, ate: ateLocal } : { periodo: p.id, de: null, ate: null })}
            aria-pressed={periodo === p.id}
            className={cn("h-8 rounded-md px-3 text-sm", periodo === p.id ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:text-foreground")}
          >
            {p.label}
          </button>
        ))}
      </div>

      {periodo === "personalizado" && (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            navegar({ periodo: "personalizado", de: deLocal, ate: ateLocal });
          }}
        >
          <CalendarRange className="size-4 text-muted-foreground" />
          <Input type="date" value={deLocal} onChange={(e) => setDe(e.target.value)} className="h-9 w-40" aria-label="De" />
          <span className="text-sm text-muted-foreground">a</span>
          <Input type="date" value={ateLocal} onChange={(e) => setAte(e.target.value)} className="h-9 w-40" aria-label="Até" />
          <Button type="submit" size="sm" variant="secondary">
            Aplicar
          </Button>
        </form>
      )}

      <Select value={obra} onValueChange={(v) => navegar({ obra: v, of: null })}>
        <SelectTrigger className="h-9 w-60">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as obras</SelectItem>
          {obras.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              <span className="font-mono text-xs text-muted-foreground">{o.codigo}</span> {o.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={of} onValueChange={(v) => navegar({ of: v })}>
        <SelectTrigger className="h-9 w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as OFs</SelectItem>
          {ofsDaObra.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.numero}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pendente && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
