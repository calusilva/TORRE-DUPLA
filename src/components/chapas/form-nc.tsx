"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LABEL_SEVERIDADE_NC, LABEL_TIPO_NC, SEVERIDADES_NC, TIPOS_NC, type SeveridadeNC, type TipoNC } from "@/lib/dominio";
import { comprimirImagem } from "@/lib/imagem";
import { cn } from "@/lib/utils";

export interface DadosFormNC {
  tipo: TipoNC;
  severidade: SeveridadeNC;
  descricao: string;
  fotoBase64?: string;
}

/** Formulário inline de não conformidade — pensado para tablet (alvos grandes). */
export function FormNC({
  titulo,
  botao,
  pendente,
  onSubmeter,
  onCancelar,
}: {
  titulo: string;
  botao: string;
  pendente: boolean;
  onSubmeter: (dados: DadosFormNC) => void;
  onCancelar: () => void;
}) {
  const [tipo, setTipo] = useState<TipoNC | null>(null);
  const [severidade, setSeveridade] = useState<SeveridadeNC>("minor");
  const [descricao, setDescricao] = useState("");
  const [foto, setFoto] = useState<string | undefined>();
  const [aProcessar, setAProcessar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);

  async function escolherFoto(f: File | undefined) {
    if (!f) return;
    setAProcessar(true);
    try {
      setFoto(await comprimirImagem(f));
    } catch {
      setErro("Não foi possível ler a imagem.");
    } finally {
      setAProcessar(false);
    }
  }

  function submeter() {
    if (!tipo) return setErro("Seleccione o tipo de problema.");
    if (descricao.trim().length < 5) return setErro("Descreva o problema (mín. 5 caracteres).");
    setErro(null);
    onSubmeter({ tipo, severidade, descricao: descricao.trim(), fotoBase64: foto });
  }

  return (
    <div className="space-y-4 rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-500/30 dark:bg-red-500/5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-red-900 dark:text-red-200">{titulo}</h3>
        <Button variant="ghost" size="icon-sm" onClick={onCancelar} aria-label="Cancelar" disabled={pendente}>
          <X />
        </Button>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Tipo</div>
        <div className="flex flex-wrap gap-2">
          {TIPOS_NC.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={cn(
                "h-10 rounded-lg border bg-background px-3 text-sm transition-colors",
                tipo === t ? "border-red-600 bg-red-600 text-white" : "hover:bg-muted",
              )}
            >
              {LABEL_TIPO_NC[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Severidade</div>
        <div className="grid grid-cols-3 gap-1 rounded-lg border bg-background p-1">
          {SEVERIDADES_NC.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeveridade(s)}
              className={cn("h-9 rounded-md text-sm", severidade === s ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-muted")}
            >
              {LABEL_SEVERIDADE_NC[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="nc-descricao" className="text-sm font-medium">
          Descrição
        </label>
        <Textarea id="nc-descricao" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Deformação na aba superior, desvio de 3 mm" className="bg-background text-base" />
      </div>

      <div className="flex items-center gap-3">
        <input ref={inputFoto} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => escolherFoto(e.target.files?.[0])} />
        {foto ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização local (data URL) */}
            <img src={foto} alt="Foto do problema" className="size-20 rounded-lg border object-cover" />
            <button type="button" onClick={() => setFoto(undefined)} className="absolute -right-2 -top-2 rounded-full bg-foreground p-0.5 text-background" aria-label="Remover foto">
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <Button type="button" variant="outline" className="h-11" onClick={() => inputFoto.current?.click()} disabled={aProcessar}>
            {aProcessar ? <Loader2 className="animate-spin" /> : <Camera />} Foto (opcional)
          </Button>
        )}
      </div>

      {erro && <p className="text-sm text-red-700 dark:text-red-300">{erro}</p>}

      <Button className="h-12 w-full bg-red-600 text-base text-white hover:bg-red-700" onClick={submeter} disabled={pendente || aProcessar}>
        {pendente && <Loader2 className="animate-spin" />}
        {botao}
      </Button>
    </div>
  );
}
