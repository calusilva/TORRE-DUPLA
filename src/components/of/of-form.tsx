"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Campo, SeccaoForm } from "@/components/comum/campo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrdemFabrico } from "@/db/schema";
import { LABEL_PERFIL, PRIORIDADES, type Perfil } from "@/lib/dominio";
import type { ResultadoAccao } from "@/lib/validacao";
import { GeradorChapas } from "./gerador-chapas";

type Accao = (prev: unknown, fd: FormData) => Promise<ResultadoAccao<{ id: string; numero: string }>>;

const MATERIAL_POR_TIPO: Record<string, string> = {
  ACM: "acmPrata",
  HPL: "hplBranco",
  GRC: "grcBeige",
  ALUCOBOND: "alucobondBronze",
  VITROCSA: "vitrocsaVidro",
};

export function OFForm({
  accao,
  of,
  obras,
  obraIdInicial,
  responsaveis,
}: {
  accao: Accao;
  of?: OrdemFabrico;
  obras: { id: string; codigo: string; nome: string; tipoFachada: string }[];
  obraIdInicial?: string;
  responsaveis: { id: string; nome: string; perfil: Perfil }[];
}) {
  const router = useRouter();
  const [estado, submeter, pendente] = useActionState(accao, null);
  const erros = estado && !estado.ok ? estado.campos ?? {} : {};
  const [obraId, setObraId] = useState(of?.obraId ?? obraIdInicial ?? "");
  const [gerar, setGerar] = useState(true);
  const obra = obras.find((o) => o.id === obraId);

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.success(estado.mensagem);
      router.push(`/of/${estado.dados.id}`);
    } else {
      toast.error(estado.erro);
    }
  }, [estado, router]);

  return (
    <form action={submeter} className="max-w-5xl">
      <SeccaoForm titulo="Ordem de fabrico" descricao={of ? undefined : "O número OF-AAAA-NNNN é atribuído automaticamente."}>
        <Campo id="obraId" label="Obra" obrigatorio erro={erros.obraId} className="sm:col-span-2">
          <Select name="obraId" value={obraId} onValueChange={setObraId} disabled={!!of}>
            <SelectTrigger id="obraId" className="w-full" aria-invalid={!!erros.obraId}>
              <SelectValue placeholder="Seleccione a obra" />
            </SelectTrigger>
            <SelectContent>
              {obras.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  <span className="font-mono text-xs text-muted-foreground">{o.codigo}</span> {o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {of && <input type="hidden" name="obraId" value={of.obraId} />}
        </Campo>
        <Campo id="descricao" label="Descrição" obrigatorio erro={erros.descricao} className="sm:col-span-2">
          <Input id="descricao" name="descricao" defaultValue={of?.descricao} placeholder="Revestimento ACM — Fachada Norte, pisos 1 a 6" aria-invalid={!!erros.descricao} />
        </Campo>
        <Campo id="zona" label="Zona(s)" erro={erros.zona} ajuda={of ? undefined : "Se vazio, usa a zona do lote de chapas."}>
          <Input id="zona" name="zona" defaultValue={of?.zona ?? ""} placeholder="Cobertura + Átrio" />
        </Campo>
        <Campo id="prioridade" label="Prioridade" obrigatorio>
          <Select name="prioridade" defaultValue={String(of?.prioridade ?? 2)}>
            <SelectTrigger id="prioridade" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORIDADES).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo id="dataFechoPrevisto" label="Fecho previsto" erro={erros.dataFechoPrevisto}>
          <Input id="dataFechoPrevisto" name="dataFechoPrevisto" type="date" defaultValue={of?.dataFechoPrevisto ?? ""} />
        </Campo>
        <Campo id="operadorResponsavelId" label="Responsável" erro={erros.operadorResponsavelId}>
          <Select name="operadorResponsavelId" defaultValue={of?.operadorResponsavelId ?? "nenhum"}>
            <SelectTrigger id="operadorResponsavelId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">— Sem responsável —</SelectItem>
              {responsaveis.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nome} <span className="text-muted-foreground">· {LABEL_PERFIL[u.perfil]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
      </SeccaoForm>

      {!of && (
        <section className="space-y-4 border-b py-8">
          <div className="flex items-start gap-3">
            <Checkbox id="gerarChapas" name="gerarChapas" checked={gerar} onCheckedChange={(v) => setGerar(v === true)} className="mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="gerarChapas" className="font-medium">
                Gerar chapas a partir da grelha da fachada
              </Label>
              <p className="text-sm text-muted-foreground">
                Cria cada chapa com código TD-AAMM-OF-SEQ, dados para QR Code e posição no layout visual. Podem ser acrescentados mais lotes depois.
              </p>
            </div>
          </div>
          {gerar && (
            <GeradorChapas
              key={obraId}
              erros={erros}
              materialInicial={MATERIAL_POR_TIPO[obra?.tipoFachada ?? "ACM"]}
            />
          )}
        </section>
      )}

      <div className="flex justify-end gap-2 pt-6">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pendente}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente && <Loader2 className="animate-spin" />}
          {of ? "Guardar alterações" : gerar ? "Criar OF e gerar chapas" : "Criar OF"}
        </Button>
      </div>
    </form>
  );
}
