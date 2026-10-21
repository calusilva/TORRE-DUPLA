"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Printer } from "lucide-react";
import { lerChapaPorId } from "@/app/actions/chapas";
import { AccoesChapa } from "@/components/chapas/accoes-chapa";
import { useMinutosDecorridos } from "@/components/scan/cartao-chapa";
import { Button } from "@/components/ui/button";
import { EstadoChapaBadge } from "@/components/ui/EstadoChapaBadge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LIMITE_MINUTOS_PRODUCAO, type Perfil } from "@/lib/dominio";
import { fmtDataHora, fmtDimensoes, fmtDuracao, fmtM2 } from "@/lib/formato";
import type { ChapaScan } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Chapa = NonNullable<ChapaScan>;

/** Painel lateral com a ficha resumida da chapa seleccionada no layout. */
export function PainelChapa({
  chapaId,
  perfil,
  onFechar,
  onActualizada,
}: {
  chapaId: string | null;
  perfil: Perfil;
  onFechar: () => void;
  onActualizada: (c: Chapa) => void;
}) {
  const [chapa, setChapa] = useState<Chapa | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!chapaId) return;
    let cancelado = false;
    setErro(null);
    lerChapaPorId(chapaId)
      .then((r) => {
        if (cancelado) return;
        if (r.ok) setChapa(r.chapa);
        else setErro(r.erro);
      })
      .catch(() => !cancelado && setErro("Sem ligação ao servidor."));
    return () => {
      cancelado = true;
    };
  }, [chapaId]);

  const actual = chapa?.id === chapaId ? chapa : null;
  const minutos = useMinutosDecorridos(actual && (actual.estado === "em_producao" || actual.estado === "em_retrabalho") ? actual.dataInicioProd : null);

  return (
    <Sheet open={!!chapaId} onOpenChange={(o) => !o && onFechar()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="font-mono text-xl">{actual?.codigo ?? "A carregar…"}</SheetTitle>
          <SheetDescription>{actual ? `${actual.numeroOf} · ${actual.cliente}` : " "}</SheetDescription>
        </SheetHeader>

        {!actual && !erro && (
          <div className="flex flex-1 items-center justify-center p-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {erro && <p className="p-4 text-sm text-destructive">{erro}</p>}

        {actual && (
          <div className="space-y-5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <EstadoChapaBadge estado={actual.estado} grande />
              {minutos !== null && (
                <span className={cn("rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums", minutos > LIMITE_MINUTOS_PRODUCAO ? "bg-red-600 text-white" : "bg-muted")}>
                  há {fmtDuracao(minutos)}
                </span>
              )}
              {actual.ncAbertas > 0 && <span className="text-sm font-medium text-red-600">{actual.ncAbertas} NC em aberto</span>}
            </div>

            <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-2 text-sm">
              {(
                [
                  ["Zona", actual.zona],
                  ["Posição", `Piso ${actual.piso} · Coluna ${actual.coluna}`],
                  ["Dimensões", fmtDimensoes(actual.largura, actual.altura)],
                  ["Área", fmtM2(actual.m2)],
                  ["Material", actual.material],
                  ["Operador", actual.operador ?? "—"],
                  ["Início produção", fmtDataHora(actual.dataInicioProd)],
                  ["Fim produção", fmtDataHora(actual.dataFimProd)],
                  ["Obra", `${actual.obraCodigo} · ${actual.obraNome}`],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd>{v || "—"}</dd>
                </div>
              ))}
            </dl>

            <AccoesChapa
              key={`${actual.id}-${actual.estado}`}
              chapa={actual}
              perfil={perfil}
              tamanho="normal"
              onActualizada={(c) => {
                setChapa(c);
                onActualizada(c);
              }}
            />

            <div className="grid grid-cols-2 gap-2 border-t pt-4">
              <Button variant="outline" asChild>
                <Link href={`/of/${actual.ofId}/chapas/${actual.id}`}>
                  <ExternalLink /> Ver ficha
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a href={`/api/chapas/${actual.id}/etiqueta`} target="_blank" rel="noopener">
                  <Printer /> Etiqueta
                </a>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
