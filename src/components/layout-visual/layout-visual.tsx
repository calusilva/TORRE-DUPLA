"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Grid3x3, Hash, Maximize, Minus, Plus, QrCode, Radio } from "lucide-react";
import { ProgressoOF } from "@/components/comum/progresso-of";
import { ImprimirEtiquetas } from "@/components/of/imprimir-etiquetas";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CORES_ESTADO, ESTADOS_CHAPA, ESTADOS_PRODUZIDOS, LABEL_ESTADO_CHAPA, type EstadoChapa, type Perfil } from "@/lib/dominio";
import type { ChapaLayout } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { FachadaCanvas } from "./FachadaCanvas";
import { PainelChapa } from "./painel-chapa";
import { useVistaFachada, ZOOM_MAX, ZOOM_MIN } from "./store";
import { useEventosTempoReal } from "./use-eventos";

type Sobreposicao = Partial<Pick<ChapaLayout, "estado" | "operador" | "dataInicioProd" | "ncAberta">>;

export function LayoutVisual({ obraId, chapas, perfil }: { obraId: string; chapas: ChapaLayout[]; perfil: Perfil }) {
  const router = useRouter();
  const vista = useVistaFachada();
  // Alterações locais aplicadas de imediato; descartadas quando chegam dados novos do servidor.
  const [sobreposicoes, setSobreposicoes] = useState<Record<string, Sobreposicao>>({});
  useEffect(() => setSobreposicoes({}), [chapas]);
  // A vista (zona, selecção) é global — repõe ao mudar de obra.
  useEffect(() => {
    useVistaFachada.getState().setZona(null);
  }, [obraId]);

  // Tempo real: outra pessoa a ler chapas no chão de fábrica actualiza este ecrã.
  const { estado: ligacao, segundosParaReligar } = useEventosTempoReal(`obra:${obraId}`, () => router.refresh());
  const ligado = ligacao === "ligado";

  const lista = useMemo(() => chapas.map((c) => (sobreposicoes[c.id] ? { ...c, ...sobreposicoes[c.id] } : c)), [chapas, sobreposicoes]);
  const zonas = useMemo(() => [...new Set(chapas.map((c) => c.zona ?? "Sem zona"))], [chapas]);
  const visiveis = vista.zona ? lista.filter((c) => (c.zona ?? "Sem zona") === vista.zona) : lista;

  const contagem = useMemo(() => {
    const m = Object.fromEntries(ESTADOS_CHAPA.map((e) => [e, 0])) as Record<EstadoChapa, number>;
    for (const c of visiveis) m[c.estado]++;
    return m;
  }, [visiveis]);
  const produzidas = ESTADOS_PRODUZIDOS.reduce((s, e) => s + contagem[e], 0);
  const pct = visiveis.length ? Math.round((produzidas / visiveis.length) * 100) : 0;

  const porZona = useMemo(
    () =>
      zonas.map((z) => {
        const l = lista.filter((c) => (c.zona ?? "Sem zona") === z);
        return { zona: z, total: l.length, produzidas: l.filter((c) => ESTADOS_PRODUZIDOS.includes(c.estado)).length, emProducao: l.filter((c) => c.estado === "em_producao").length };
      }),
    [zonas, lista],
  );

  const porProduzir = visiveis.filter((c) => c.estado === "por_produzir");
  const grupos = [
    { id: "sem_etiqueta", label: "Por produzir sem etiqueta", ids: porProduzir.filter((c) => !c.temEtiqueta).map((c) => c.id) },
    { id: "por_produzir", label: "Todas por produzir", ids: porProduzir.map((c) => c.id) },
    { id: "visiveis", label: vista.zona ? `Todas as chapas — ${vista.zona}` : "Todas as chapas da obra", ids: visiveis.map((c) => c.id) },
  ];

  function zoomBotao(factor: number) {
    const el = document.getElementById("fachada-canvas");
    vista.zoomEm(factor, (el?.clientWidth ?? 800) / 2, (el?.clientHeight ?? 500) / 2);
  }

  return (
    <div className="space-y-4">
      {/* Contador + progresso por zona */}
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <div className="rounded-xl border bg-card px-5 py-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{vista.zona ?? "Toda a obra"}</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
            {produzidas}/{visiveis.length} <span className="text-lg font-normal text-muted-foreground">chapas produzidas ({pct}%)</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Radio className={cn("size-3.5", ligado ? "text-green-600" : "text-muted-foreground")} />
            {ligado ? "Actualização em tempo real" : ligacao === "a_ligar" ? "A ligar…" : `A reconectar${segundosParaReligar ? ` em ${segundosParaReligar} s` : "…"}`}
          </div>
        </div>
        {porZona.length > 1 && (
          <div className="grid content-center gap-2 rounded-xl border bg-card px-5 py-3">
            {porZona.map((z) => (
              <button key={z.zona} type="button" onClick={() => vista.setZona(vista.zona === z.zona ? null : z.zona)} className={cn("grid items-center gap-3 rounded-md text-left sm:grid-cols-[9rem_1fr]", vista.zona && vista.zona !== z.zona && "opacity-50")}>
                <span className="truncate text-sm font-medium">{z.zona}</span>
                <ProgressoOF produzidas={z.produzidas} total={z.total} emProducao={z.emProducao} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Barra de ferramentas */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={vista.zona ?? "todas"} onValueChange={(v) => vista.setZona(v === "todas" ? null : v)}>
          <SelectTrigger className="h-9 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as zonas</SelectItem>
            {zonas.map((z) => (
              <SelectItem key={z} value={z}>
                {z}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          <Button variant="ghost" size="icon-sm" onClick={() => zoomBotao(1 / 1.25)} aria-label="Reduzir zoom">
            <Minus />
          </Button>
          <input
            type="range"
            min={Math.log(ZOOM_MIN)}
            max={Math.log(ZOOM_MAX)}
            step={0.01}
            value={Math.log(vista.zoom)}
            onChange={(e) => zoomBotao(Math.exp(Number(e.target.value)) / vista.zoom)}
            className="w-24 accent-primary"
            aria-label="Zoom"
          />
          <Button variant="ghost" size="icon-sm" onClick={() => zoomBotao(1.25)} aria-label="Aumentar zoom">
            <Plus />
          </Button>
          <span className="w-11 text-center text-xs tabular-nums text-muted-foreground">{Math.round(vista.zoom * 100)}%</span>
          <Button variant="ghost" size="icon-sm" onClick={() => window.dispatchEvent(new Event("fachada:ajustar"))} aria-label="Ajustar ao ecrã" title="Ajustar ao ecrã">
            <Maximize />
          </Button>
        </div>

        <Button variant={vista.mostrarCodigos ? "secondary" : "ghost"} size="sm" onClick={vista.alternarCodigos} aria-pressed={vista.mostrarCodigos}>
          <Hash /> Códigos
        </Button>
        <Button variant={vista.mostrarPisos ? "secondary" : "ghost"} size="sm" onClick={vista.alternarPisos} aria-pressed={vista.mostrarPisos}>
          <Grid3x3 /> Pisos
        </Button>

        <div className="ml-auto">
          <ImprimirEtiquetas
            grupos={grupos}
            trigger={
              <Button size="sm">
                <QrCode /> Gerar QR Codes em batch
              </Button>
            }
          />
        </div>
      </div>

      <div id="fachada-canvas">
        <FachadaCanvas chapas={lista} className="h-[62svh] min-h-[420px]" />
      </div>

      {/* Legenda com contagens — clicar destaca o estado */}
      <div className="flex flex-wrap gap-x-1 gap-y-1.5">
        {ESTADOS_CHAPA.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => vista.setDestaque(e)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-muted",
              vista.destaque === e && "bg-muted ring-1 ring-foreground/20",
              vista.destaque && vista.destaque !== e && "opacity-50",
            )}
          >
            <span className={cn("size-3.5 rounded ring-1 ring-black/10", e === "em_producao" && "animate-pulse")} style={{ backgroundColor: CORES_ESTADO[e] }} />
            {LABEL_ESTADO_CHAPA[e]}
            <span className="font-semibold tabular-nums">{contagem[e]}</span>
          </button>
        ))}
        <span className="inline-flex items-center gap-2 px-2.5 py-1.5 text-sm text-muted-foreground">
          <span className="size-2.5 rounded-full bg-red-600" /> NC em aberto
        </span>
        {vista.destaque && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => vista.setDestaque(vista.destaque)}>
            Limpar destaque
          </Button>
        )}
      </div>

      <PainelChapa
        chapaId={vista.seleccionada}
        perfil={perfil}
        onFechar={() => vista.seleccionar(null)}
        onActualizada={(c) => {
          setSobreposicoes((s) => ({ ...s, [c.id]: { estado: c.estado, operador: c.operador, dataInicioProd: c.dataInicioProd, ncAberta: c.ncAbertas > 0 } }));
          router.refresh();
        }}
      />
    </div>
  );
}
