"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CORES_ESTADO, LABEL_ESTADO_CHAPA, LIMITE_MINUTOS_PRODUCAO, type EstadoChapa } from "@/lib/dominio";
import { ESCALA_LAYOUT } from "@/lib/fachada";
import { fmtDimensoes, fmtDuracao, minutosEntre } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { useVistaFachada } from "./store";

export interface ChapaDesenho {
  id: string;
  codigo: string;
  estado: EstadoChapa;
  numeroOf: string;
  zona: string | null;
  piso: number | null;
  coluna: string | null;
  x: number;
  y: number;
  largura: number; // mm
  altura: number; // mm
  operador: string | null;
  dataInicioProd: Date | string | null;
  ncAberta: boolean;
}

const TITULO_ZONA = 30;
const ESPACO_ZONAS = 56;
const MARGEM_ESQ = 40;
const PAD_AJUSTE = 32;

interface ZonaDesenho {
  zona: string;
  offsetY: number;
  largura: number;
  altura: number;
  total: number;
  produzidas: number;
  pisos: { piso: number; y0: number; y1: number }[];
}

/** Agrupa as chapas por zona e empilha as zonas verticalmente. */
function prepararDesenho(chapas: ChapaDesenho[], zonaFiltro: string | null) {
  const porZona = new Map<string, ChapaDesenho[]>();
  for (const c of chapas) {
    const z = c.zona ?? "Sem zona";
    if (zonaFiltro && z !== zonaFiltro) continue;
    if (!porZona.has(z)) porZona.set(z, []);
    porZona.get(z)!.push(c);
  }

  const zonas: ZonaDesenho[] = [];
  const rects: (ChapaDesenho & { rx: number; ry: number; w: number; h: number })[] = [];
  let offsetY = 0;
  for (const [zona, lista] of porZona) {
    let maxX = 0;
    let maxY = 0;
    const pisos = new Map<number, { y0: number; y1: number }>();
    for (const c of lista) {
      const w = c.largura * ESCALA_LAYOUT;
      const h = c.altura * ESCALA_LAYOUT;
      const ry = offsetY + TITULO_ZONA + c.y;
      rects.push({ ...c, rx: c.x, ry, w, h });
      maxX = Math.max(maxX, c.x + w);
      maxY = Math.max(maxY, c.y + h);
      if (c.piso !== null) {
        const p = pisos.get(c.piso) ?? { y0: Infinity, y1: -Infinity };
        pisos.set(c.piso, { y0: Math.min(p.y0, ry), y1: Math.max(p.y1, ry + h) });
      }
    }
    const produzidas = lista.filter((c) => !["por_produzir", "em_producao"].includes(c.estado)).length;
    zonas.push({
      zona,
      offsetY,
      largura: maxX,
      altura: maxY,
      total: lista.length,
      produzidas,
      pisos: [...pisos].map(([piso, v]) => ({ piso, ...v })).sort((a, b) => a.y0 - b.y0),
    });
    offsetY += TITULO_ZONA + maxY + ESPACO_ZONAS;
  }
  const largura = Math.max(0, ...zonas.map((z) => z.largura));
  const altura = Math.max(0, offsetY - ESPACO_ZONAS);
  return { zonas, rects, largura, altura };
}

/**
 * Fachada em SVG: cada chapa é um <rect> na posição X/Y gravada na geração.
 * Zoom com roda/pinça/botões, pan por arrasto, tooltip ao passar e selecção por clique.
 */
export function FachadaCanvas({ chapas, className }: { chapas: ChapaDesenho[]; className?: string }) {
  const contentor = useRef<HTMLDivElement>(null);
  const { zoom, panX, panY, zona, mostrarCodigos, mostrarPisos, destaque, seleccionada, setVista, zoomEm, seleccionar } = useVistaFachada();
  const desenho = useMemo(() => prepararDesenho(chapas, zona), [chapas, zona]);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [aArrastar, setAArrastar] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const [ajustado, setAjustado] = useState(false);

  // Relógio para o tempo em produção no tooltip.
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const ajustar = useCallback(() => {
    const el = contentor.current;
    if (!el || !desenho.largura) return;
    const larguraTotal = desenho.largura + MARGEM_ESQ;
    const z = Math.min((el.clientWidth - PAD_AJUSTE * 2) / larguraTotal, (el.clientHeight - PAD_AJUSTE * 2) / desenho.altura, 3);
    setVista({
      zoom: z,
      panX: (el.clientWidth - larguraTotal * z) / 2 + MARGEM_ESQ * z,
      panY: (el.clientHeight - desenho.altura * z) / 2,
    });
    setAjustado(true);
  }, [desenho.largura, desenho.altura, setVista]);

  // Ajusta ao ecrã ao abrir e ao mudar de zona.
  useEffect(() => {
    ajustar();
  }, [ajustar]);
  useEffect(() => {
    const onAjustar = () => ajustar();
    window.addEventListener("fachada:ajustar", onAjustar);
    return () => window.removeEventListener("fachada:ajustar", onAjustar);
  }, [ajustar]);

  // Roda do rato: listener nativo não-passivo para poder impedir o scroll da página.
  useEffect(() => {
    const el = contentor.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const r = el!.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      useVistaFachada.getState().zoomEm(factor, e.clientX - r.left, e.clientY - r.top);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Arrasto (pan) e pinça (zoom) com Pointer Events.
  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef<{ inicio: { x: number; y: number }; pan: { x: number; y: number }; moveu: boolean; distancia?: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    contentor.current?.setPointerCapture(e.pointerId);
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = useVistaFachada.getState();
    if (ponteiros.current.size === 1) {
      gesto.current = { inicio: { x: e.clientX, y: e.clientY }, pan: { x: s.panX, y: s.panY }, moveu: false };
    } else if (ponteiros.current.size === 2) {
      const [a, b] = [...ponteiros.current.values()];
      gesto.current = { inicio: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, pan: { x: s.panX, y: s.panY }, moveu: true, distancia: Math.hypot(a.x - b.x, a.y - b.y) };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const r = contentor.current!.getBoundingClientRect();
    if (!ponteiros.current.has(e.pointerId)) {
      // Apenas hover.
      const id = (e.target as Element).getAttribute?.("data-id");
      setHover(id ? { id, x: e.clientX - r.left, y: e.clientY - r.top } : null);
      return;
    }
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesto.current;
    if (!g) return;

    if (ponteiros.current.size === 2 && g.distancia) {
      const [a, b] = [...ponteiros.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomEm(d / g.distancia, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      g.distancia = d;
      return;
    }
    const dx = e.clientX - g.inicio.x;
    const dy = e.clientY - g.inicio.y;
    if (!g.moveu && Math.hypot(dx, dy) < 5) return;
    g.moveu = true;
    setAArrastar(true);
    setHover(null);
    setVista({ panX: g.pan.x + dx, panY: g.pan.y + dy });
  }

  function onPointerUp(e: React.PointerEvent) {
    const g = gesto.current;
    ponteiros.current.delete(e.pointerId);
    if (ponteiros.current.size === 0) {
      if (g && !g.moveu) {
        const id = (document.elementFromPoint(e.clientX, e.clientY) as Element | null)?.getAttribute("data-id");
        seleccionar(id ?? null);
      }
      gesto.current = null;
      setAArrastar(false);
    }
  }

  const chapaHover = hover ? desenho.rects.find((r) => r.id === hover.id) : null;
  const traco = 1 / zoom;

  return (
    <div
      ref={contentor}
      className={cn(
        "relative touch-none select-none overflow-hidden rounded-xl border bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:16px_16px]",
        aArrastar ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => setHover(null)}
      role="application"
      aria-label="Layout da fachada. Use os botões de zoom ou a roda do rato; arraste para mover."
    >
      <svg className={cn("absolute inset-0 size-full transition-opacity duration-300", ajustado ? "opacity-100" : "opacity-0")}>
        <g transform={`translate(${panX} ${panY}) scale(${zoom})`}>
          {desenho.zonas.map((z) => (
            <g key={z.zona}>
              <text x={0} y={z.offsetY + 18} fontSize={15} fontWeight={600} className="fill-foreground">
                {z.zona}
                <tspan dx={10} fontSize={12} fontWeight={400} className="fill-muted-foreground">
                  {z.produzidas}/{z.total} produzidas · {z.total ? Math.round((z.produzidas / z.total) * 100) : 0}%
                </tspan>
              </text>
              {mostrarPisos &&
                z.pisos.map((p) => (
                  <g key={p.piso}>
                    <line x1={-MARGEM_ESQ + 6} x2={z.largura + 8} y1={p.y1 + 1} y2={p.y1 + 1} className="stroke-muted-foreground/40" strokeWidth={traco} strokeDasharray={`${4 * traco} ${3 * traco}`} />
                    <text x={-10} y={(p.y0 + p.y1) / 2} textAnchor="end" dominantBaseline="central" fontSize={11} className="fill-muted-foreground font-medium">
                      P{p.piso}
                    </text>
                  </g>
                ))}
            </g>
          ))}

          {desenho.rects.map((c) => {
            const atenuada = destaque !== null && c.estado !== destaque;
            const sel = c.id === seleccionada;
            const fonte = Math.min(10, c.h * 0.32);
            const seq = c.codigo.slice(-4);
            return (
              <g key={c.id} opacity={atenuada ? 0.15 : 1} className="transition-opacity">
                <rect
                  data-id={c.id}
                  x={c.rx}
                  y={c.ry}
                  width={c.w}
                  height={c.h}
                  rx={1.5}
                  fill={CORES_ESTADO[c.estado]}
                  className={cn("cursor-pointer stroke-black/15 hover:brightness-95 dark:stroke-white/10", c.estado === "em_producao" && "chapa-em-producao")}
                  strokeWidth={traco}
                >
                  <title>{`${c.codigo} — ${LABEL_ESTADO_CHAPA[c.estado]}`}</title>
                </rect>
                {mostrarCodigos && c.w > 22 && (
                  <text x={c.rx + c.w / 2} y={c.ry + c.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={fonte} className="pointer-events-none fill-black/60 font-mono">
                    {c.w > 95 ? `${c.numeroOf.slice(-4)}-${seq}` : seq}
                  </text>
                )}
                {c.ncAberta && <circle cx={c.rx + c.w - 5} cy={c.ry + 5} r={3.2} fill="#dc2626" stroke="#fff" strokeWidth={0.8} className="pointer-events-none" />}
                {sel && <rect x={c.rx - 1.5} y={c.ry - 1.5} width={c.w + 3} height={c.h + 3} rx={2.5} fill="none" className="pointer-events-none stroke-foreground" strokeWidth={2.5 * traco} />}
              </g>
            );
          })}
        </g>
      </svg>

      {chapaHover && hover && !aArrastar && (
        <Tooltip chapa={chapaHover} x={hover.x} y={hover.y} agora={agora} larguraContentor={contentor.current?.clientWidth ?? 0} />
      )}
    </div>
  );
}

function Tooltip({ chapa, x, y, agora, larguraContentor }: { chapa: ChapaDesenho; x: number; y: number; agora: number; larguraContentor: number }) {
  const min = chapa.estado === "em_producao" && chapa.dataInicioProd ? minutosEntre(chapa.dataInicioProd, new Date(agora)) : null;
  const esquerda = x > larguraContentor - 240;
  return (
    <div
      className="pointer-events-none absolute z-10 w-56 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-lg"
      style={{ left: esquerda ? x - 236 : x + 14, top: y + 14 }}
    >
      <div className="font-mono text-sm font-semibold">{chapa.codigo}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="size-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: CORES_ESTADO[chapa.estado] }} />
        <span className="font-medium">{LABEL_ESTADO_CHAPA[chapa.estado]}</span>
        {min !== null && <span className={cn("ml-auto tabular-nums", min > LIMITE_MINUTOS_PRODUCAO && "font-semibold text-red-600")}>há {fmtDuracao(min)}</span>}
      </div>
      <div className="mt-2 space-y-0.5 text-muted-foreground">
        <div>
          {chapa.numeroOf} · P{chapa.piso} · Col. {chapa.coluna}
        </div>
        <div>{fmtDimensoes(chapa.largura, chapa.altura)}</div>
        {chapa.operador && <div>Operador: {chapa.operador}</div>}
        {chapa.ncAberta && <div className="font-medium text-red-600">Não conformidade em aberto</div>}
      </div>
    </div>
  );
}
