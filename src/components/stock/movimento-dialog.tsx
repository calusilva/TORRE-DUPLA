"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { registarMovimento } from "@/app/actions/stock";
import { Campo } from "@/components/comum/campo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { actualizarContadores, comTimeout, toastFalhaRede } from "@/lib/accao-cliente";
import { LABEL_UNIDADE, type UnidadeMaterial } from "@/lib/dominio";
import { fmtQtd } from "@/lib/formato";
import { cn } from "@/lib/utils";

interface MaterialDialogo {
  id: string;
  codigo: string;
  nome: string;
  unidade: UnidadeMaterial;
  actual: number;
  fornecedor: string | null;
}

/** Registo manual de movimento: entrada de material ou ajuste de inventário. */
export function MovimentoDialog({ material }: { material: MaterialDialogo }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<"entrada" | "ajuste">("entrada");
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [fornecedor, setFornecedor] = useState(material.fornecedor ?? "");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [pendente, startTransition] = useTransition();
  const un = LABEL_UNIDADE[material.unidade];

  const q = Number(quantidade.replace(",", "."));
  const resultado = Number.isFinite(q) && quantidade !== "" ? (tipo === "entrada" ? material.actual + q : q) : null;

  function reiniciar(t: "entrada" | "ajuste") {
    setTipo(t);
    setQuantidade("");
    setMotivo(t === "ajuste" ? "Inventário — contagem física" : "");
    setErros({});
  }

  function submeter() {
    startTransition(async () => {
      try {
        const r = await comTimeout(registarMovimento({ materialId: material.id, tipo, quantidade: q, motivo, fornecedor: tipo === "entrada" ? fornecedor : undefined }));
        if (r.ok) {
          toast.success(r.mensagem);
          actualizarContadores();
          setAberto(false);
          router.refresh();
        } else {
          setErros(r.campos ?? {});
          toast.error(r.erro);
        }
      } catch (e) {
        toastFalhaRede(e, submeter);
      }
    });
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (o) {
          reiniciar("entrada");
          setFornecedor(material.fornecedor ?? "");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PackagePlus /> Registar movimento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registar movimento</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{material.codigo}</span> · {material.nome} · stock actual {fmtQtd(material.actual, material.unidade)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg border p-1">
            {(["entrada", "ajuste"] as const).map((t) => (
              <button key={t} type="button" onClick={() => reiniciar(t)} className={cn("h-9 rounded-md text-sm", tipo === t ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-muted")}>
                {t === "entrada" ? "Entrada" : "Ajuste de inventário"}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">As saídas são registadas automaticamente quando uma chapa entra em produção.</p>

          <Campo id="mov-quantidade" label={tipo === "entrada" ? `Quantidade recebida (${un})` : `Stock contado (${un})`} obrigatorio erro={erros.quantidade}>
            <Input id="mov-quantidade" type="number" inputMode="decimal" min={0} step="any" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="h-10 text-base tabular-nums" autoFocus />
          </Campo>
          {resultado !== null && (
            <div className="flex justify-between rounded-lg bg-muted px-3 py-2 text-sm tabular-nums">
              <span className="text-muted-foreground">Stock resultante</span>
              <span>
                {fmtQtd(material.actual, material.unidade)} → <strong>{fmtQtd(resultado, material.unidade)}</strong>
                {tipo === "ajuste" && <span className={cn("ml-2", resultado - material.actual < 0 ? "text-red-600" : "text-green-600")}>({resultado - material.actual >= 0 ? "+" : "−"}{fmtQtd(Math.abs(resultado - material.actual), material.unidade)})</span>}
              </span>
            </div>
          )}
          {tipo === "entrada" && (
            <Campo id="mov-fornecedor" label="Fornecedor" erro={erros.fornecedor}>
              <Input id="mov-fornecedor" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
            </Campo>
          )}
          <Campo id="mov-motivo" label="Motivo" obrigatorio erro={erros.motivo}>
            <Input id="mov-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={tipo === "entrada" ? "Guia de remessa GR-4521" : "Inventário — contagem física"} />
          </Campo>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)} disabled={pendente}>
            Cancelar
          </Button>
          <Button onClick={submeter} disabled={pendente || quantidade === ""}>
            {pendente && <Loader2 className="animate-spin" />}
            Registar {tipo === "entrada" ? "entrada" : "ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
