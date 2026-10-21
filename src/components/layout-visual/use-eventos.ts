"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Subscreve o canal SSE /api/events e chama `onAlteracao` quando a versão dos
 * dados muda (ex.: uma chapa lida noutro dispositivo). Devolve se está ligado.
 */
export function useEventosTempoReal(canal: string, onAlteracao: () => void) {
  const [ligado, setLigado] = useState(false);
  const callback = useRef(onAlteracao);
  useEffect(() => {
    callback.current = onAlteracao;
  }, [onAlteracao]);

  useEffect(() => {
    const es = new EventSource(`/api/events?canal=${encodeURIComponent(canal)}`);
    let versao: string | null = null;
    es.addEventListener("open", () => setLigado(true));
    es.addEventListener("error", () => setLigado(false));
    es.addEventListener("versao", (e) => {
      const nova = (e as MessageEvent).data as string;
      if (versao !== null && nova !== versao) callback.current();
      versao = nova;
    });
    return () => es.close();
  }, [canal]);

  return ligado;
}
