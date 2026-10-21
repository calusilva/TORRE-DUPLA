"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { actualizarContadores, comTimeout, toastFalhaRede } from "@/lib/accao-cliente";

/**
 * Botão que executa uma server action com loading + toast.
 * Com `confirmacao`, pede confirmação num diálogo antes de executar.
 */
export function AccaoConfirmada({
  accao,
  children,
  confirmacao,
  redirecionar,
  variant = "outline",
  size = "default",
}: {
  accao: () => Promise<{ ok: true; mensagem?: string } | { ok: false; erro: string }>;
  children: React.ReactNode;
  confirmacao?: { titulo: string; descricao: string; botao: string; destrutiva?: boolean };
  redirecionar?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [aberto, setAberto] = useState(false);

  function executar() {
    startTransition(async () => {
      try {
        const r = await comTimeout(accao());
        if (r.ok) {
          toast.success(r.mensagem);
          actualizarContadores();
          setAberto(false);
          if (redirecionar) router.push(redirecionar);
          else router.refresh();
        } else {
          toast.error(r.erro);
          setAberto(false);
        }
      } catch (e) {
        toastFalhaRede(e, executar);
      }
    });
  }

  if (!confirmacao) {
    return (
      <Button variant={variant} size={size} onClick={executar} disabled={pendente}>
        {pendente && <Loader2 className="animate-spin" />}
        {children}
      </Button>
    );
  }

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} disabled={pendente}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmacao.titulo}</AlertDialogTitle>
          <AlertDialogDescription>{confirmacao.descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendente}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant={confirmacao.destrutiva ? "destructive" : "default"}
            onClick={(e) => {
              e.preventDefault();
              executar();
            }}
            disabled={pendente}
          >
            {pendente && <Loader2 className="animate-spin" />}
            {confirmacao.botao}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
