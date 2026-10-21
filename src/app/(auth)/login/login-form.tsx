"use client";

import { useActionState, useRef } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { entrar } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONTAS_DEMO = [
  { email: "admin@demo.gs", nome: "Admin GS", perfil: "Administrador" },
  { email: "rui@demo.gs", nome: "Rui Ferreira", perfil: "Encarregado" },
  { email: "joao@demo.gs", nome: "João Santos", perfil: "Operador" },
  { email: "manuel@demo.gs", nome: "Manuel Rodrigues", perfil: "Inspector QC" },
];

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [estado, accao, pendente] = useActionState(entrar, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  function preencher(email: string) {
    const form = formRef.current;
    if (!form) return;
    (form.elements.namedItem("email") as HTMLInputElement).value = email;
    (form.elements.namedItem("password") as HTMLInputElement).value = "demo123";
    form.requestSubmit();
  }

  return (
    <div className="space-y-8">
      <form ref={formRef} action={accao} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo ?? "/"} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required placeholder="nome@torredupla.pt" className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Palavra-passe</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-10" />
        </div>
        {estado?.erro && (
          <p role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {estado.erro}
          </p>
        )}
        <Button type="submit" className="h-10 w-full" disabled={pendente}>
          {pendente && <Loader2 className="animate-spin" />}
          Entrar
        </Button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Contas de demonstração
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CONTAS_DEMO.map((c) => (
            <button
              key={c.email}
              type="button"
              disabled={pendente}
              onClick={() => preencher(c.email)}
              className="rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted disabled:opacity-50"
            >
              <div className="text-sm font-medium">{c.nome}</div>
              <div className="text-xs text-muted-foreground">{c.perfil}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
