"use client";

import { useActionState } from "react";
import { Loader2, Search } from "lucide-react";
import { procurarRastreabilidade } from "@/app/actions/chapas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PesquisaRastreabilidade() {
  const [estado, accao, pendente] = useActionState(procurarRastreabilidade, undefined);
  return (
    <form action={accao} className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="codigo" placeholder="TD-2610-0089-0044 ou 89-44" className="h-11 pl-9 font-mono" autoFocus autoComplete="off" />
        </div>
        <Button type="submit" className="h-11" disabled={pendente}>
          {pendente && <Loader2 className="animate-spin" />} Procurar
        </Button>
      </div>
      {estado?.erro && <p className="text-sm text-destructive">{estado.erro}</p>}
    </form>
  );
}
