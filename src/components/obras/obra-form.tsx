"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Campo, SeccaoForm } from "@/components/comum/campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Obra } from "@/db/schema";
import { ESTADOS_OBRA, LABEL_ESTADO_OBRA, TIPOS_FACHADA } from "@/lib/dominio";
import type { ResultadoAccao } from "@/lib/validacao";

type Accao = (prev: unknown, fd: FormData) => Promise<ResultadoAccao<{ id: string; codigo: string }>>;

export function ObraForm({
  accao,
  obra,
  encarregados,
}: {
  accao: Accao;
  obra?: Obra;
  encarregados: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [estado, submeter, pendente] = useActionState(accao, null);
  const erros = estado && !estado.ok ? estado.campos ?? {} : {};

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.success(estado.mensagem);
      router.push(`/obras/${estado.dados.id}`);
    } else {
      toast.error(estado.erro);
    }
  }, [estado, router]);

  return (
    <form action={submeter} className="max-w-4xl">
      <SeccaoForm titulo="Identificação" descricao="O código TD-AAAA-NNN é atribuído automaticamente.">
        <Campo id="nome" label="Nome da obra" obrigatorio erro={erros.nome} className="sm:col-span-2">
          <Input id="nome" name="nome" defaultValue={obra?.nome} placeholder="Edifício Arco — Fachada Principal" aria-invalid={!!erros.nome} />
        </Campo>
        <Campo id="cliente" label="Cliente" obrigatorio erro={erros.cliente}>
          <Input id="cliente" name="cliente" defaultValue={obra?.cliente} placeholder="Arq. Silva & Associados" aria-invalid={!!erros.cliente} />
        </Campo>
        <Campo id="localObra" label="Local da obra" erro={erros.localObra}>
          <Input id="localObra" name="localObra" defaultValue={obra?.localObra ?? ""} placeholder="Lisboa, Parque das Nações" />
        </Campo>
      </SeccaoForm>

      <SeccaoForm titulo="Fachada" descricao="Sistema de revestimento e área total a produzir.">
        <Campo id="tipoFachada" label="Tipo de fachada" obrigatorio erro={erros.tipoFachada}>
          <Select name="tipoFachada" defaultValue={obra?.tipoFachada ?? "ACM"}>
            <SelectTrigger id="tipoFachada" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_FACHADA.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo id="totalM2" label="Área total (m²)" obrigatorio erro={erros.totalM2}>
          <Input id="totalM2" name="totalM2" type="number" step="0.01" min="0" defaultValue={obra?.totalM2} placeholder="847,50" aria-invalid={!!erros.totalM2} />
        </Campo>
      </SeccaoForm>

      <SeccaoForm titulo="Planeamento">
        <Campo id="dataInicioProducao" label="Início de produção" erro={erros.dataInicioProducao}>
          <Input id="dataInicioProducao" name="dataInicioProducao" type="date" defaultValue={obra?.dataInicioProducao ?? ""} />
        </Campo>
        <Campo id="dataEntregaPrevista" label="Entrega prevista" erro={erros.dataEntregaPrevista}>
          <Input id="dataEntregaPrevista" name="dataEntregaPrevista" type="date" defaultValue={obra?.dataEntregaPrevista ?? ""} aria-invalid={!!erros.dataEntregaPrevista} />
        </Campo>
        <Campo id="encarregadoId" label="Encarregado" erro={erros.encarregadoId}>
          <Select name="encarregadoId" defaultValue={obra?.encarregadoId ?? encarregados[0]?.id ?? "nenhum"}>
            <SelectTrigger id="encarregadoId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">— Sem encarregado —</SelectItem>
              {encarregados.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        {obra && (
          <Campo id="estado" label="Estado">
            <Select name="estado" defaultValue={obra.estado}>
              <SelectTrigger id="estado" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_OBRA.map((e) => (
                  <SelectItem key={e} value={e}>
                    {LABEL_ESTADO_OBRA[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
        )}
        <Campo id="observacoes" label="Observações" className="sm:col-span-2">
          <Textarea id="observacoes" name="observacoes" rows={3} defaultValue={obra?.observacoes ?? ""} />
        </Campo>
      </SeccaoForm>

      <div className="flex justify-end gap-2 border-t pt-6">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pendente}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente && <Loader2 className="animate-spin" />}
          {obra ? "Guardar alterações" : "Criar obra"}
        </Button>
      </div>
    </form>
  );
}
