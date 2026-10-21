"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { adicionarLoteChapas } from "@/app/actions/ofs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GeradorChapas } from "./gerador-chapas";

export function AdicionarLote({
  ofId,
  numero,
  zonasExistentes,
  materialInicial,
  pisoInicial,
  abertoInicial = false,
}: {
  abertoInicial?: boolean;
  ofId: string;
  numero: string;
  zonasExistentes: string[];
  materialInicial?: string;
  pisoInicial?: number;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(abertoInicial);
  const [estado, submeter, pendente] = useActionState(adicionarLoteChapas.bind(null, ofId), null);

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.success(estado.mensagem);
      setAberto(false);
      router.refresh();
    } else {
      toast.error(estado.erro);
    }
  }, [estado, router]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus /> Gerar chapas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gerar chapas — {numero}</DialogTitle>
          <DialogDescription>
            Os códigos continuam a sequência da OF; as posições no layout visual são calculadas automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form action={submeter} className="space-y-4">
          {aberto && (
            <GeradorChapas
              erros={estado && !estado.ok ? estado.campos : undefined}
              zonaInicial={zonasExistentes[0] ?? ""}
              materialInicial={materialInicial}
              pisoInicial={pisoInicial}
              zonasExistentes={zonasExistentes}
            />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)} disabled={pendente}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendente}>
              {pendente && <Loader2 className="animate-spin" />}
              Gerar chapas
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
