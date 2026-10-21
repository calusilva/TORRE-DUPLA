"use client";

import { useRef } from "react";
import { useSSE } from "@/lib/use-sse";

/**
 * Subscreve o canal SSE /api/events e chama `onAlteracao` quando a versão dos
 * dados muda (ex.: uma chapa lida noutro dispositivo).
 */
export function useEventosTempoReal(canal: string, onAlteracao: () => void) {
  const versao = useRef<string | null>(null);
  return useSSE(`/api/events?canal=${encodeURIComponent(canal)}`, {
    versao: (nova) => {
      if (versao.current !== null && nova !== versao.current) onAlteracao();
      versao.current = nova;
    },
  });
}
