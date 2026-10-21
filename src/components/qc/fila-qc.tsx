"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RotateCcw, Search, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { transicionarChapa } from "@/app/actions/chapas";
import { FormNC, type DadosFormNC } from "@/components/chapas/form-nc";
import { EstadoChapaBadge } from "@/components/ui/EstadoChapaBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { actualizarContadores, comTimeout, toastFalhaRede } from "@/lib/accao-cliente";
import { fmtDuracao, fmtInt, minutosEntre } from "@/lib/formato";
import type { ItemFilaQC } from "@/lib/consultas/qc";
import { cn } from "@/lib/utils";

const TODAS = "todas";

/** Fila de inspecção QC com aprovação e reprovação inline. */
export function FilaQC({ itens }: { itens: ItemFilaQC[] }) {
  const router = useRouter();
  const [obra, setObra] = useState(TODAS);
  const [of, setOf] = useState(TODAS);
  const [zona, setZona] = useState(TODAS);
  const [q, setQ] = useState("");
  const [aReprovar, setAReprovar] = useState<string | null>(null);
  const [emCurso, setEmCurso] = useState<string | null>(null);
  const [removidas, setRemovidas] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  // Dados novos do servidor substituem as remoções optimistas.
  useEffect(() => setRemovidas(new Set()), [itens]);

  const visiveis = itens.filter((i) => !removidas.has(i.id));
  const obras = useMemo(() => uniq(itens.map((i) => [i.obraId, `${i.obraCodigo} · ${i.obraNome}`])), [itens]);
  const ofs = useMemo(() => uniq(itens.filter((i) => obra === TODAS || i.obraId === obra).map((i) => [i.ofId, i.numeroOf])), [itens, obra]);
  const zonas = useMemo(() => uniq(itens.filter((i) => (obra === TODAS || i.obraId === obra) && (of === TODAS || i.ofId === of)).map((i) => [i.zona ?? "—", i.zona ?? "—"])), [itens, obra, of]);

  const filtradas = visiveis.filter(
    (i) =>
      (obra === TODAS || i.obraId === obra) &&
      (of === TODAS || i.ofId === of) &&
      (zona === TODAS || (i.zona ?? "—") === zona) &&
      (!q.trim() || i.codigo.includes(q.trim().toUpperCase())),
  );

  function decidir(item: ItemFilaQC, nc?: DadosFormNC) {
    setEmCurso(item.id);
    startTransition(async () => {
      try {
        const r = await comTimeout(transicionarChapa({ chapaId: item.id, novoEstado: nc ? "rejeitada_qc" : "aprovada_qc", estadoEsperado: "produzida", nc }));
        if (r.ok) {
          toast.success(nc ? `${item.codigo} reprovada — NC registada` : `${item.codigo} aprovada`);
          setRemovidas((s) => new Set(s).add(item.id));
          setAReprovar(null);
          actualizarContadores();
          router.refresh();
        } else {
          toast.error(r.erro);
          router.refresh();
        }
      } catch (e) {
        toastFalhaRede(e, () => decidir(item, nc));
      } finally {
        setEmCurso(null);
      }
    });
  }

  const filtrosActivos = obra !== TODAS || of !== TODAS || zona !== TODAS || q.trim() !== "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-lg">
          <strong className="text-3xl font-semibold tabular-nums">{visiveis.length}</strong>{" "}
          {visiveis.length === 1 ? "chapa aguarda" : "chapas aguardam"} inspecção
          {filtrosActivos && <span className="text-sm text-muted-foreground"> · {filtradas.length} com os filtros actuais</span>}
        </p>
      </div>

      {itens.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar código" className="h-9 pl-8 font-mono" />
          </div>
          <Filtro valor={obra} onChange={(v) => { setObra(v); setOf(TODAS); setZona(TODAS); }} todas="Todas as obras" opcoes={obras} largura="w-64" />
          <Filtro valor={of} onChange={(v) => { setOf(v); setZona(TODAS); }} todas="Todas as OFs" opcoes={ofs} />
          <Filtro valor={zona} onChange={setZona} todas="Todas as zonas" opcoes={zonas} />
          {filtrosActivos && (
            <button type="button" className="inline-flex h-9 items-center gap-1 px-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => { setObra(TODAS); setOf(TODAS); setZona(TODAS); setQ(""); }}>
              <RotateCcw className="size-3.5" /> Limpar
            </button>
          )}
        </div>
      )}

      {visiveis.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/15">
            <CheckCircle2 className="size-8 text-green-600" />
          </span>
          <div className="text-lg font-semibold">Sem chapas para inspeccionar — bom trabalho!</div>
          <p className="max-w-sm text-sm text-muted-foreground">As chapas marcadas como produzidas no chão de fábrica aparecem aqui automaticamente.</p>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">Nenhuma chapa corresponde aos filtros.</div>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[60rem] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-2.5">Código</th>
                    <th className="px-3 py-2.5">Obra / OF</th>
                    <th className="px-3 py-2.5">Zona</th>
                    <th className="whitespace-nowrap px-3 py-2.5">L × A (mm)</th>
                    <th className="px-3 py-2.5">Operador</th>
                    <th className="px-3 py-2.5">Produzida</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-4 py-2.5 text-right">Decisão</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((i) => (
                    <Fragment key={i.id}>
                      <tr className={cn("border-b last:border-0", aReprovar === i.id && "bg-red-50/60 dark:bg-red-500/5")}>
                        <td className="px-4 py-3">
                          <Link href={`/of/${i.ofId}/chapas/${i.id}`} className="whitespace-nowrap font-mono font-medium hover:underline">
                            {i.codigo}
                          </Link>
                          {i.retrabalhada && <div className="text-xs text-orange-600">Reinspecção após retrabalho</div>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="max-w-48 truncate">{i.cliente}</div>
                          <div className="font-mono text-xs text-muted-foreground">{i.numeroOf}</div>
                        </td>
                        <td className="px-3 py-3">
                          {i.zona} <span className="text-muted-foreground">· P{i.piso}·{i.coluna}</span>
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          {fmtInt(i.largura)} × {fmtInt(i.altura)}
                        </td>
                        <td className="px-3 py-3">{i.operador ?? "—"}</td>
                        <td className="px-3 py-3 tabular-nums">
                          <TempoEspera desde={i.dataFimProd} agora={agora} />
                        </td>
                        <td className="px-3 py-3">
                          <EstadoChapaBadge estado="produzida" />
                        </td>
                        <td className="px-4 py-3">
                          <Botoes item={i} emCurso={emCurso} aReprovar={aReprovar} onAprovar={() => decidir(i)} onReprovar={() => setAReprovar(aReprovar === i.id ? null : i.id)} />
                        </td>
                      </tr>
                      {aReprovar === i.id && (
                        <tr className="border-b">
                          <td colSpan={8} className="bg-red-50/40 px-4 py-4 dark:bg-red-500/5">
                            <div className="max-w-3xl">
                              <FormNC titulo={`Reprovar ${i.codigo}`} botao="Reprovar e registar NC" comAcao pendente={emCurso === i.id} onCancelar={() => setAReprovar(null)} onSubmeter={(nc) => decidir(i, nc)} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: cartões */}
          <ul className="space-y-3 md:hidden">
            {filtradas.map((i) => (
              <li key={i.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/of/${i.ofId}/chapas/${i.id}`} className="font-mono text-lg font-semibold">
                    {i.codigo}
                  </Link>
                  <EstadoChapaBadge estado="produzida" />
                </div>
                <div className="mt-1 space-y-0.5 text-sm">
                  <div>
                    <span className="font-mono">{i.numeroOf}</span> · {i.cliente}
                  </div>
                  <div className="text-muted-foreground">
                    {i.zona} · P{i.piso}·{i.coluna} · {fmtInt(i.largura)} × {fmtInt(i.altura)} mm
                  </div>
                  <div className="text-muted-foreground">
                    {i.operador ?? "—"} · <TempoEspera desde={i.dataFimProd} agora={agora} />
                  </div>
                </div>
                <div className="mt-3">
                  {aReprovar === i.id ? (
                    <FormNC titulo="Reprovar em QC" botao="Reprovar e registar NC" comAcao pendente={emCurso === i.id} onCancelar={() => setAReprovar(null)} onSubmeter={(nc) => decidir(i, nc)} />
                  ) : (
                    <Botoes item={i} emCurso={emCurso} aReprovar={aReprovar} grande onAprovar={() => decidir(i)} onReprovar={() => setAReprovar(i.id)} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Botoes({ item, emCurso, aReprovar, grande, onAprovar, onReprovar }: { item: ItemFilaQC; emCurso: string | null; aReprovar: string | null; grande?: boolean; onAprovar: () => void; onReprovar: () => void }) {
  const ocupado = emCurso === item.id;
  const altura = grande ? "h-12 flex-1 text-base" : "h-9";
  return (
    <div className={cn("flex justify-end gap-2", grande && "w-full")}>
      <button type="button" onClick={onReprovar} disabled={ocupado} className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10", altura, aReprovar === item.id && "bg-red-100 dark:bg-red-500/15")}>
        <X className="size-4" /> Reprovar
      </button>
      <button type="button" onClick={onAprovar} disabled={ocupado} className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 font-medium text-white hover:bg-green-700 disabled:opacity-60", altura)}>
        {ocupado && aReprovar !== item.id ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Aprovar
      </button>
    </div>
  );
}

function TempoEspera({ desde, agora }: { desde: Date | string | null; agora: number }) {
  if (!desde) return <span>—</span>;
  const min = minutosEntre(desde, new Date(agora));
  return <span className={cn(min > 24 * 60 && "font-medium text-amber-600")}>há {min >= 24 * 60 ? `${Math.floor(min / 1440)}d ${fmtDuracao(min % 1440)}` : fmtDuracao(min)}</span>;
}

function Filtro({ valor, onChange, todas, opcoes, largura = "w-44" }: { valor: string; onChange: (v: string) => void; todas: string; opcoes: [string, string][]; largura?: string }) {
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9", largura)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODAS}>{todas}</SelectItem>
        {opcoes.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function uniq(pares: string[][]): [string, string][] {
  return [...new Map(pares.map(([k, v]) => [k, v])).entries()];
}
