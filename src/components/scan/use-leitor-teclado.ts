"use client";

import { useEffect, useRef } from "react";

/** Intervalo máximo entre teclas para considerar que é um leitor (USB/Bluetooth em modo teclado). */
export const INTERVALO_LEITOR_MS = 50;
/** Acima disto é uma pessoa a escrever. */
export const INTERVALO_HUMANO_MS = 200;

export type OrigemLeitura = "leitor" | "manual" | "camara";

/** Classifica uma sequência de teclas pelo intervalo médio entre elas. */
export function classificarSequencia(tempos: number[]): OrigemLeitura {
  if (tempos.length < 4) return "manual";
  const intervalos = tempos.slice(1).map((t, i) => t - tempos[i]);
  const medio = intervalos.reduce((a, b) => a + b, 0) / intervalos.length;
  return medio < INTERVALO_LEITOR_MS ? "leitor" : "manual";
}

/**
 * Captura leituras de um leitor em modo teclado em qualquer parte da página
 * (excepto quando o foco está num campo de texto). Detecta rajadas rápidas
 * terminadas em Enter — ou sem Enter, após 120 ms de silêncio.
 */
export function useLeitorTeclado(onLeitura: (texto: string) => void, activo = true) {
  const buffer = useRef<{ texto: string; tempos: number[] }>({ texto: "", tempos: [] });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callback = useRef(onLeitura);

  useEffect(() => {
    callback.current = onLeitura;
  }, [onLeitura]);

  useEffect(() => {
    if (!activo) return;

    function emitirSeLeitor() {
      const { texto, tempos } = buffer.current;
      buffer.current = { texto: "", tempos: [] };
      if (texto.length >= 6 && classificarSequencia(tempos) === "leitor") callback.current(texto);
    }

    function onKeyDown(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement;
      if (alvo.closest("input, textarea, select, [contenteditable=true]")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const agora = performance.now();
      const ultimo = buffer.current.tempos.at(-1);
      if (ultimo && agora - ultimo > INTERVALO_HUMANO_MS) buffer.current = { texto: "", tempos: [] };
      if (timer.current) clearTimeout(timer.current);

      if (e.key === "Enter") {
        if (buffer.current.texto) e.preventDefault();
        emitirSeLeitor();
        return;
      }
      if (e.key.length !== 1) return;
      buffer.current.texto += e.key;
      buffer.current.tempos.push(agora);
      timer.current = setTimeout(emitirSeLeitor, 120);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [activo]);
}
