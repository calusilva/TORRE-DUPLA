"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Barra de pesquisa + filtro de estado, sincronizada com a query string. */
export function Filtros({
  placeholder,
  estados,
  extra,
}: {
  placeholder: string;
  estados: { valor: string; label: string }[];
  extra?: { param: string; label: string; opcoes: { valor: string; label: string }[] };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendente, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  function definir(chave: string, valor: string | null) {
    const p = new URLSearchParams(params);
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    startTransition(() => router.replace(`${pathname}?${p}`, { scroll: false }));
  }

  // Pesquisa com debounce.
  useEffect(() => {
    if ((params.get("q") ?? "") === q) return;
    const t = setTimeout(() => definir("q", q.trim() || null), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-9 pl-8" />
      </div>
      <Select value={params.get("estado") ?? "todos"} onValueChange={(v) => definir("estado", v === "todos" ? null : v)}>
        <SelectTrigger className="h-9 w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os estados</SelectItem>
          {estados.map((e) => (
            <SelectItem key={e.valor} value={e.valor}>
              {e.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {extra && (
        <Select value={params.get(extra.param) ?? "todos"} onValueChange={(v) => definir(extra.param, v === "todos" ? null : v)}>
          <SelectTrigger className="h-9 w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">{extra.label}</SelectItem>
            {extra.opcoes.map((o) => (
              <SelectItem key={o.valor} value={o.valor}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {pendente && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
