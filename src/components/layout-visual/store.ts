"use client";

import { create } from "zustand";
import type { EstadoChapa } from "@/lib/dominio";

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 6;

interface EstadoVista {
  zoom: number;
  panX: number;
  panY: number;
  zona: string | null; // null = todas
  mostrarCodigos: boolean;
  mostrarPisos: boolean;
  destaque: EstadoChapa | null;
  seleccionada: string | null;
  setVista: (v: Partial<Pick<EstadoVista, "zoom" | "panX" | "panY">>) => void;
  /** Zoom centrado num ponto do ecrã (coordenadas do contentor). */
  zoomEm: (factor: number, cx: number, cy: number) => void;
  setZona: (z: string | null) => void;
  alternarCodigos: () => void;
  alternarPisos: () => void;
  setDestaque: (e: EstadoChapa | null) => void;
  seleccionar: (id: string | null) => void;
}

const limitar = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

export const useVistaFachada = create<EstadoVista>((set) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  zona: null,
  mostrarCodigos: true,
  mostrarPisos: true,
  destaque: null,
  seleccionada: null,
  setVista: (v) => set((s) => ({ ...v, zoom: v.zoom !== undefined ? limitar(v.zoom) : s.zoom })),
  zoomEm: (factor, cx, cy) =>
    set((s) => {
      const zoom = limitar(s.zoom * factor);
      const k = zoom / s.zoom;
      return { zoom, panX: cx - (cx - s.panX) * k, panY: cy - (cy - s.panY) * k };
    }),
  setZona: (zona) => set({ zona, seleccionada: null }),
  alternarCodigos: () => set((s) => ({ mostrarCodigos: !s.mostrarCodigos })),
  alternarPisos: () => set((s) => ({ mostrarPisos: !s.mostrarPisos })),
  setDestaque: (destaque) => set((s) => ({ destaque: s.destaque === destaque ? null : destaque })),
  seleccionar: (seleccionada) => set({ seleccionada }),
}));
