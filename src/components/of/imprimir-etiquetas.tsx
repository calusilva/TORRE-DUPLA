"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Formato = "A4_4por_pagina" | "A6_individual" | "rolo";

const FORMATOS: { valor: Formato; titulo: string; detalhe: string; w: number; h: number; n: number }[] = [
  { valor: "A4_4por_pagina", titulo: "A4 — 4 por página", detalhe: "Impressora de escritório, com linhas de corte", w: 42, h: 30, n: 4 },
  { valor: "A6_individual", titulo: "A6 individual", detalhe: "148 × 105 mm, uma etiqueta por página", w: 30, h: 21, n: 1 },
  { valor: "rolo", titulo: "Rolo contínuo", detalhe: "100 × 70 mm, impressora térmica (Zebra)", w: 24, h: 17, n: 1 },
];

export interface GrupoEtiquetas {
  id: string;
  label: string;
  ids: string[];
}

/** Gera o PDF de etiquetas (POST /api/qr/gerar) e abre-o num novo separador. */
export function ImprimirEtiquetas({
  grupos,
  grupoInicial,
  trigger,
}: {
  grupos: GrupoEtiquetas[];
  grupoInicial?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [formato, setFormato] = useState<Formato>("A4_4por_pagina");
  const [barcode, setBarcode] = useState(true);
  const [grupoId, setGrupoId] = useState(grupoInicial ?? grupos.find((g) => g.ids.length)?.id ?? grupos[0]?.id);
  const [pendente, setPendente] = useState(false);

  const grupo = grupos.find((g) => g.id === grupoId) ?? grupos[0];
  const n = grupo?.ids.length ?? 0;
  const paginas = formato === "A4_4por_pagina" ? Math.ceil(n / 4) : n;

  async function gerar() {
    if (!grupo || !n) return;
    setPendente(true);
    // Abrir já a janela evita o bloqueio de pop-ups após o pedido assíncrono.
    const janela = window.open("", "_blank");
    try {
      const res = await fetch("/api/qr/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapaIds: grupo.ids, formato, incluirBarcode: barcode }),
      });
      if (!res.ok) {
        const erro = await res.json().catch(() => ({ erro: "Erro ao gerar etiquetas" }));
        throw new Error(erro.erro);
      }
      const url = URL.createObjectURL(await res.blob());
      if (janela) janela.location.href = url;
      else {
        const a = document.createElement("a");
        a.href = url;
        a.download = "etiquetas.pdf";
        a.click();
      }
      toast.success(`${n} etiqueta${n === 1 ? "" : "s"} gerada${n === 1 ? "" : "s"}`, { description: `${paginas} página${paginas === 1 ? "" : "s"} · ${FORMATOS.find((f) => f.valor === formato)?.titulo}` });
      setAberto(false);
      router.refresh();
    } catch (e) {
      janela?.close();
      toast.error(e instanceof Error ? e.message : "Erro ao gerar etiquetas");
    } finally {
      setPendente(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Printer /> Imprimir etiquetas
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Imprimir etiquetas</DialogTitle>
          <DialogDescription>QR Code + código de barras Code 128 para cada chapa.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {grupos.length > 1 && (
            <div className="space-y-2">
              <Label>Chapas</Label>
              <div className="grid gap-1.5">
                {grupos.map((g) => (
                  <label
                    key={g.id}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
                      grupoId === g.id && "border-primary bg-muted",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <input type="radio" name="grupo" className="accent-primary" checked={grupoId === g.id} disabled={!g.ids.length} onChange={() => setGrupoId(g.id)} />
                      {g.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{g.ids.length}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Formato</Label>
            <div className="grid grid-cols-3 gap-2">
              {FORMATOS.map((f) => (
                <button
                  key={f.valor}
                  type="button"
                  onClick={() => setFormato(f.valor)}
                  className={cn("flex flex-col items-center gap-2 rounded-lg border p-3 text-center hover:bg-muted", formato === f.valor && "border-primary bg-muted ring-1 ring-primary")}
                >
                  <MiniaturaFormato {...f} />
                  <span className="text-xs font-medium leading-tight">{f.titulo}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{FORMATOS.find((f) => f.valor === formato)?.detalhe}</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={barcode} onCheckedChange={(v) => setBarcode(v === true)} />
            Incluir código de barras Code 128 (leitores USB)
          </label>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-sm text-muted-foreground tabular-nums">
            {n} etiqueta{n === 1 ? "" : "s"} · {paginas} página{paginas === 1 ? "" : "s"}
          </span>
          <Button onClick={gerar} disabled={pendente || !n}>
            {pendente ? <Loader2 className="animate-spin" /> : <Printer />}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MiniaturaFormato({ w, h, n }: { w: number; h: number; n: number }) {
  return (
    <svg width={w + 4} height={h + 4} viewBox={`-2 -2 ${w + 4} ${h + 4}`} aria-hidden>
      <rect x={0} y={0} width={w} height={h} rx={1.5} className="fill-background stroke-muted-foreground" strokeWidth={1} />
      {n === 4 ? (
        <>
          {[0, 1].flatMap((r) =>
            [0, 1].map((c) => <rect key={`${r}${c}`} x={2 + c * (w / 2)} y={2 + r * (h / 2)} width={w / 2 - 4} height={h / 2 - 4} rx={1} className="fill-muted-foreground/30" />),
          )}
        </>
      ) : (
        <rect x={2.5} y={2.5} width={w - 5} height={h - 5} rx={1} className="fill-muted-foreground/30" />
      )}
    </svg>
  );
}
