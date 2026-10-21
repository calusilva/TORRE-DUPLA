"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check, Loader2, MapPin, Pause, Play, ShieldCheck, Truck, Wrench, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { reportarProblema, transicionarChapa } from "@/app/actions/chapas";
import { Button } from "@/components/ui/button";
import { accaoTransicao, transicoesPermitidas, type AccaoTransicao, type EstadoChapa, type Perfil } from "@/lib/dominio";
import type { ChapaScan } from "@/lib/queries";
import { actualizarContadores, comTimeout, mensagemFalha, toastFalhaRede } from "@/lib/accao-cliente";
import { cn } from "@/lib/utils";
import { FormNC, type DadosFormNC } from "./form-nc";

const ICONES: Record<AccaoTransicao["icone"], LucideIcon> = { play: Play, check: Check, pause: Pause, shield: ShieldCheck, x: X, wrench: Wrench, truck: Truck, pin: MapPin };

const TOM: Record<AccaoTransicao["tom"], string> = {
  primario: "bg-primary text-primary-foreground hover:bg-primary/85",
  sucesso: "bg-green-600 text-white hover:bg-green-700",
  neutro: "border bg-background text-foreground hover:bg-muted",
  perigo: "bg-red-600 text-white hover:bg-red-700",
};

type Chapa = NonNullable<ChapaScan>;

/** Tenta obter a localização (instalação em obra) sem bloquear mais de 3 s. */
function obterGps(): Promise<{ lat: number; lng: number } | undefined> {
  if (!("geolocation" in navigator)) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(undefined),
      { timeout: 3000, maximumAge: 60_000 },
    );
  });
}

/**
 * Botões de transição válidos para a chapa e o perfil actual.
 * A reprovação em QC (e "Reportar problema") abre o formulário de não conformidade inline.
 */
export function AccoesChapa({
  chapa,
  perfil,
  tamanho = "grande",
  onActualizada,
  onResultado,
}: {
  chapa: Chapa;
  perfil: Perfil;
  tamanho?: "grande" | "normal";
  onActualizada: (c: Chapa) => void;
  onResultado?: (ok: boolean, mensagem: string, para?: EstadoChapa) => void;
}) {
  const [pendente, startTransition] = useTransition();
  const [emCurso, setEmCurso] = useState<EstadoChapa | "nc" | null>(null);
  const [formNC, setFormNC] = useState<"reprovar" | "reportar" | null>(null);

  const destinos = transicoesPermitidas(chapa.estado, perfil);
  const grande = tamanho === "grande";

  function executar(para: EstadoChapa, nc?: DadosFormNC) {
    setEmCurso(para);
    startTransition(async () => {
      const gps = para === "instalada" ? await obterGps() : undefined;
      let r;
      try {
        r = await comTimeout(transicionarChapa({ chapaId: chapa.id, novoEstado: para, estadoEsperado: chapa.estado, nc, gps }));
      } catch (e) {
        setEmCurso(null);
        toastFalhaRede(e, () => executar(para, nc));
        onResultado?.(false, mensagemFalha(e), para);
        return;
      }
      setEmCurso(null);
      if (r.ok) {
        setFormNC(null);
        toast.success(r.mensagem);
        actualizarContadores();
        onActualizada(r.chapa);
        onResultado?.(true, r.mensagem ?? "", para);
      } else {
        toast.error(r.erro);
        onResultado?.(false, r.erro, para);
      }
    });
  }

  function reportar(nc: DadosFormNC) {
    setEmCurso("nc");
    startTransition(async () => {
      let r;
      try {
        r = await comTimeout(reportarProblema({ chapaId: chapa.id, ...nc }));
      } catch (e) {
        setEmCurso(null);
        toastFalhaRede(e, () => reportar(nc));
        onResultado?.(false, mensagemFalha(e));
        return;
      }
      setEmCurso(null);
      if (r.ok) {
        setFormNC(null);
        toast.success(r.mensagem);
        onActualizada(r.chapa);
        onResultado?.(true, r.mensagem ?? "");
      } else {
        toast.error(r.erro);
        onResultado?.(false, r.erro);
      }
    });
  }

  if (formNC) {
    return (
      <FormNC
        titulo={formNC === "reprovar" ? "Reprovar em QC — não conformidade" : "Reportar problema"}
        botao={formNC === "reprovar" ? "Reprovar e registar NC" : "Registar não conformidade"}
        pendente={pendente}
        onCancelar={() => setFormNC(null)}
        onSubmeter={(nc) => (formNC === "reprovar" ? executar("rejeitada_qc", nc) : reportar(nc))}
      />
    );
  }

  return (
    <div className={cn("grid gap-2", grande && "gap-3")}>
      {destinos.length === 0 && (
        <p className="rounded-lg bg-muted px-3 py-2.5 text-center text-sm text-muted-foreground">
          {chapa.estado === "instalada" ? "Chapa instalada — ciclo concluído." : "Sem acções disponíveis para o seu perfil neste estado."}
        </p>
      )}
      {destinos.map((para) => {
        const a = accaoTransicao(chapa.estado, para)!;
        const Icone = ICONES[a.icone];
        const aCorrer = pendente && emCurso === para;
        return (
          <button
            key={para}
            type="button"
            disabled={pendente}
            onClick={() => (para === "rejeitada_qc" ? setFormNC("reprovar") : executar(para))}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-60",
              grande ? "h-16 text-lg" : "h-10 text-sm",
              TOM[a.tom],
            )}
          >
            {aCorrer ? <Loader2 className={cn("animate-spin", grande ? "size-6" : "size-4")} /> : <Icone className={grande ? "size-6" : "size-4"} />}
            {a.label}
          </button>
        );
      })}
      {chapa.estado !== "instalada" && (
        <Button variant="ghost" className={cn("text-amber-700 hover:text-amber-800 dark:text-amber-400", grande && "h-12 text-base")} onClick={() => setFormNC("reportar")} disabled={pendente}>
          <AlertTriangle /> Reportar problema
        </Button>
      )}
    </div>
  );
}
