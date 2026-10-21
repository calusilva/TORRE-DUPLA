"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LABEL_TIPO_MOVIMENTO, TIPOS_MOVIMENTO } from "@/lib/dominio";

export function FiltrosMovimentos({ materiais }: { materiais: { id: string; codigo: string; nome: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendente, startTransition] = useTransition();

  function definir(chave: string, valor: string) {
    const p = new URLSearchParams(params);
    if (valor === "todos") p.delete(chave);
    else p.set(chave, valor);
    startTransition(() => router.replace(`${pathname}?${p}`, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={params.get("material") ?? "todos"} onValueChange={(v) => definir("material", v)}>
        <SelectTrigger className="h-9 w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os materiais</SelectItem>
          {materiais.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              <span className="font-mono text-xs text-muted-foreground">{m.codigo}</span> {m.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={params.get("tipo") ?? "todos"} onValueChange={(v) => definir("tipo", v)}>
        <SelectTrigger className="h-9 w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os tipos</SelectItem>
          {TIPOS_MOVIMENTO.filter((t) => t !== "reserva").map((t) => (
            <SelectItem key={t} value={t}>
              {LABEL_TIPO_MOVIMENTO[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pendente && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
