"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, Maximize, Minimize, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { actualizarDashboard } from "@/app/actions/dashboard";
import { LogoMark } from "@/components/brand/logo";
import { CORES_ESTADO, LABEL_ESTADO_CHAPA, LIMITE_MINUTOS_PRODUCAO, type EstadoChapa } from "@/lib/dominio";
import { fmtCronometro, fmtDimensoes, fmtInt, fmtM2, fmtRelativo } from "@/lib/formato";
import type { DadosDashboard } from "@/lib/servicos/dashboard";
import { cn } from "@/lib/utils";
import { GraficoEstados } from "./grafico-estados";
import { BannerLigacao } from "@/components/comum/banner-ligacao";
import { useSSE } from "@/lib/use-sse";

const DF_RELOGIO = new Intl.DateTimeFormat("pt-PT", { weekday: "short", day: "numeric", month: "short" });
const DF_HORA = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" });

/** Relógio partilhado — um único setInterval por segundo para todos os cronómetros. */
function useRelogio(intervalo = 1000) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), intervalo);
    return () => clearInterval(t);
  }, [intervalo]);
  return agora;
}

/**
 * Dashboard do chão de fábrica, pensado para TV: sempre em tema escuro,
 * actualizado por SSE (/api/events?canal=dashboard) e com modo ecrã inteiro (tecla F).
 */
export function DashboardProducao({ inicial, modoTV = false }: { inicial: DadosDashboard; modoTV?: boolean }) {
  const [dados, setDados] = useState(inicial);
  const [ultimaRecepcao, setUltimaRecepcao] = useState(() => Date.now());
  const [ecraInteiro, setEcraInteiro] = useState(false);
  const [novos, setNovos] = useState<Set<string>>(new Set());
  const [aActualizar, startActualizar] = useTransition();
  const contentor = useRef<HTMLDivElement>(null);
  const eventosVistos = useRef(new Set(inicial.eventos.map((e) => e.id)));
  const agora = useRelogio();

  const receber = useCallback((d: DadosDashboard) => {
    const chegados = d.eventos.filter((e) => !eventosVistos.current.has(e.id)).map((e) => e.id);
    chegados.forEach((id) => eventosVistos.current.add(id));
    if (chegados.length) {
      setNovos(new Set(chegados));
      setTimeout(() => setNovos(new Set()), 4000);
    }
    setDados(d);
    setUltimaRecepcao(Date.now());
  }, []);

  // SSE com reconexão (backoff 2 s → 30 s).
  const { estado: ligacao, segundosParaReligar } = useSSE("/api/events?canal=dashboard", {
    dashboard: (d) => receber(JSON.parse(d)),
  });
  const ligado = ligacao === "ligado";

  // Ecrã inteiro: tecla F ou botão.
  const alternarEcraInteiro = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else contentor.current?.requestFullscreen().catch(() => toast.error("O navegador não permitiu o modo ecrã inteiro."));
  }, []);
  useEffect(() => {
    const onChange = () => setEcraInteiro(!!document.fullscreenElement);
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "f" || e.key === "F") && !(e.target as HTMLElement).closest("input, textarea, select") && !e.metaKey && !e.ctrlKey) alternarEcraInteiro();
    };
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("keydown", onKey);
    };
  }, [alternarEcraInteiro]);

  function actualizarManual() {
    startActualizar(async () => {
      try {
        receber(await actualizarDashboard());
        toast.success("Dashboard actualizado");
      } catch {
        toast.error("Não foi possível actualizar.");
      }
    });
  }

  const { kpis } = dados;
  const pctMeta = Math.min(100, (kpis.produzidasHoje / kpis.meta) * 100);
  const segundosDesdeDados = Math.round((agora - ultimaRecepcao) / 1000);

  return (
    <div
      ref={contentor}
      className={cn(
        "dark flex flex-col gap-4 bg-neutral-950 text-foreground",
        ecraInteiro ? "h-screen overflow-hidden p-6" : modoTV ? "fixed inset-0 z-50 overflow-hidden p-6" : "-m-4 min-h-[calc(100svh-3.5rem)] p-4 lg:-m-6 lg:p-6",
      )}
    >
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-center gap-4">
        <LogoMark invertido className="size-10" />
        <div className="leading-tight">
          <div className="text-lg font-semibold">
            GS ERP Industrial <span className="text-muted-foreground">| Torre Dupla</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={cn("size-2 rounded-full", ligado ? "animate-pulse bg-green-500" : "bg-amber-500")} />
            {ligado ? `Ao vivo · actualizado ${segundosDesdeDados < 5 ? "agora" : `há ${segundosDesdeDados} s`}` : ligacao === "a_ligar" ? "A ligar…" : `Sem ligação · dados de há ${segundosDesdeDados} s`}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="text-3xl font-semibold tabular-nums tracking-tight">{DF_HORA.format(agora)}</div>
            <div className="text-sm capitalize text-muted-foreground">{DF_RELOGIO.format(agora).replace(/\./g, "")}</div>
          </div>
          <button type="button" onClick={actualizarManual} className="rounded-lg border border-white/10 p-2.5 text-muted-foreground hover:bg-white/5 hover:text-foreground" aria-label="Actualizar agora" title="Actualizar agora">
            <RefreshCw className={cn("size-5", aActualizar && "animate-spin")} />
          </button>
          <button type="button" onClick={alternarEcraInteiro} className="rounded-lg border border-white/10 p-2.5 text-muted-foreground hover:bg-white/5 hover:text-foreground" aria-label="Ecrã inteiro (F)" title="Ecrã inteiro (F)">
            {ecraInteiro ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </button>
        </div>
      </header>

      <BannerLigacao estado={ligacao} segundos={segundosParaReligar} />

      {/* KPIs do dia */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi titulo="Produzidas hoje">
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-bold tabular-nums tracking-tight">{kpis.produzidasHoje}</span>
            <span className="text-xl text-muted-foreground">/ {kpis.meta}</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className={cn("h-full rounded-full transition-all duration-700", pctMeta >= 100 ? "bg-green-500" : pctMeta >= 60 ? "bg-amber-400" : "bg-red-500")} style={{ width: `${pctMeta}%` }} />
          </div>
          <div className="mt-1.5 text-sm text-muted-foreground">{Math.round((kpis.produzidasHoje / kpis.meta) * 100)}% da meta diária</div>
        </Kpi>
        <Kpi titulo="Área produzida hoje">
          <div className="text-6xl font-bold tabular-nums tracking-tight">
            {fmtInt(kpis.m2Hoje)}
            <span className="ml-1 text-2xl font-medium text-muted-foreground">m²</span>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">{fmtM2(kpis.m2Semana, 1)} acumulados esta semana</div>
        </Kpi>
        <Kpi titulo="OFs activas">
          <div className="text-6xl font-bold tabular-nums tracking-tight">{kpis.ofsActivas}</div>
          <div className="mt-3 text-sm text-muted-foreground">
            {dados.emProducao.length} chapas em produção · {dados.porEstado.por_produzir} por produzir
          </div>
        </Kpi>
        <Kpi titulo="Taxa de aprovação QC">
          <div className="text-6xl font-bold tabular-nums tracking-tight">
            {kpis.taxaQc === null ? "—" : Math.round(kpis.taxaQc * 100)}
            <span className="ml-1 text-2xl font-medium text-muted-foreground">%</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
            <span>{kpis.inspeccoesQc} inspecções (30 dias)</span>
            {kpis.ncAbertas > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-red-400">
                <AlertTriangle className="size-3.5" /> {kpis.ncAbertas} NC abertas
              </span>
            )}
          </div>
        </Kpi>
      </section>

      {/* Centro */}
      <section className={cn("grid gap-4 xl:grid-cols-12", ecraInteiro || modoTV ? "min-h-0 flex-1" : "xl:h-[34rem]")}>
        <div className="flex min-h-0 flex-col gap-4 xl:col-span-7">
          <Painel titulo="Chapas por estado" detalhe="OFs em curso" className="min-h-[300px] flex-1">
            <div className="h-full min-h-[240px]">
              <GraficoEstados porEstado={dados.porEstado} />
            </div>
          </Painel>
          {dados.ofs.length > 0 && (
            <Painel titulo="OFs em produção">
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {dados.ofs.slice(0, 4).map((of) => {
                  const pct = of.total ? (of.produzidas / of.total) * 100 : 0;
                  return (
                    <div key={of.id} className="min-w-0">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate">
                          <span className="font-mono font-semibold">{of.numero}</span> <span className="text-muted-foreground">{of.cliente}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          <span className="font-semibold text-foreground">{Math.round(pct)}%</span> {of.produzidas}/{of.total}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className={cn("h-full rounded-full", pct > 75 ? "bg-green-500" : pct >= 25 ? "bg-amber-400" : "bg-red-500")} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Painel>
          )}
        </div>

        <Painel titulo="Em produção agora" detalhe={`${dados.emProducao.length} chapas`} className="min-h-[300px] xl:col-span-5">
          {dados.emProducao.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">Nenhuma chapa em produção.</div>
          ) : (
            <ul className="-mx-1 flex h-full flex-col gap-2 overflow-y-auto px-1">
              {dados.emProducao.map((c) => {
                const segundos = c.inicio ? (agora - new Date(c.inicio).getTime()) / 1000 : 0;
                const excedido = segundos / 60 > LIMITE_MINUTOS_PRODUCAO;
                return (
                  <li key={c.id} className={cn("flex shrink-0 items-center gap-4 rounded-xl border px-4 py-3", excedido ? "alerta-piscar border-red-500 text-white" : "border-white/10 bg-white/[0.03]")}>
                    <span className={cn("size-3 shrink-0 rounded-full", excedido ? "bg-white" : "animate-pulse bg-amber-400")} />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-lg font-semibold leading-tight">{c.codigo}</div>
                      <div className={cn("truncate text-sm", excedido ? "text-white/85" : "text-muted-foreground")}>
                        {c.operador ?? "—"} · {c.zona} P{c.piso}·{c.coluna} · {fmtDimensoes(c.largura, c.altura)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-2xl font-semibold tabular-nums">{fmtCronometro(segundos)}</div>
                      {excedido && (
                        <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase">
                          <AlertTriangle className="size-3.5" /> &gt; {LIMITE_MINUTOS_PRODUCAO} min
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Painel>
      </section>

      {/* Última actividade */}
      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">Última actividade</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {dados.eventos.map((e) => (
            <li
              key={e.id}
              className={cn(
                "rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors duration-1000",
                novos.has(e.id) && "border-green-500/60 bg-green-500/15",
              )}
            >
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="tabular-nums">{e.timestamp ? DF_HORA.format(new Date(e.timestamp)) : ""}</span>
                <span>{fmtRelativo(e.timestamp, agora)}</span>
              </div>
              <div className="mt-1 font-mono font-semibold">{e.codigo}</div>
              <div className="mt-1 flex items-center gap-1.5 text-sm">
                {e.de && <span className="truncate text-muted-foreground">{LABEL_ESTADO_CHAPA[e.de as EstadoChapa]}</span>}
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: CORES_ESTADO[e.para as EstadoChapa] }} />
                <span className="truncate font-medium">{LABEL_ESTADO_CHAPA[e.para as EstadoChapa]}</span>
              </div>
              {e.utilizador && <div className="mt-0.5 truncate text-xs text-muted-foreground">{e.utilizador}</div>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Kpi({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">{titulo}</div>
      {children}
    </div>
  );
}

function Painel({ titulo, detalhe, className, children }: { titulo: string; detalhe?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5", className)}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{titulo}</h2>
        {detalhe && <span className="text-sm text-muted-foreground">{detalhe}</span>}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
