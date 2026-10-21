"use client";

import { useEffect, useRef, useState } from "react";

export type EstadoLigacao = "a_ligar" | "ligado" | "a_reconectar";

const BACKOFF_MS = [2_000, 4_000, 8_000, 16_000, 30_000];

/**
 * EventSource com reconexão controlada: em caso de falha fecha a ligação e
 * volta a tentar com backoff exponencial (2 s, 4 s, 8 s… máx. 30 s), expondo a
 * contagem decrescente para a interface.
 */
export function useSSE(url: string, eventos: Record<string, (dados: string) => void>) {
  const [estado, setEstado] = useState<EstadoLigacao>("a_ligar");
  const [proximaEm, setProximaEm] = useState<number | null>(null); // timestamp da próxima tentativa
  const [agora, setAgora] = useState(() => Date.now());
  const handlers = useRef(eventos);
  useEffect(() => {
    handlers.current = eventos;
  });

  useEffect(() => {
    let es: EventSource | null = null;
    let tentativa = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let terminado = false;

    function ligar() {
      setProximaEm(null);
      es = new EventSource(url);
      es.addEventListener("open", () => {
        tentativa = 0;
        setEstado("ligado");
      });
      es.addEventListener("error", () => {
        es?.close();
        if (terminado) return;
        const espera = BACKOFF_MS[Math.min(tentativa, BACKOFF_MS.length - 1)];
        tentativa++;
        setEstado("a_reconectar");
        setProximaEm(Date.now() + espera);
        timer = setTimeout(ligar, espera);
      });
      for (const nome of Object.keys(handlers.current)) {
        es.addEventListener(nome, (e) => handlers.current[nome]?.((e as MessageEvent).data));
      }
    }

    ligar();
    // Ao voltar a ter rede, tenta logo em vez de esperar pelo backoff.
    const online = () => {
      if (timer) clearTimeout(timer);
      es?.close();
      tentativa = 0;
      ligar();
    };
    window.addEventListener("online", online);
    return () => {
      terminado = true;
      if (timer) clearTimeout(timer);
      es?.close();
      window.removeEventListener("online", online);
    };
  }, [url]);

  // Contagem decrescente visível.
  useEffect(() => {
    if (proximaEm === null) return;
    const t = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(t);
  }, [proximaEm]);

  const segundos = proximaEm === null ? null : Math.max(0, Math.ceil((proximaEm - agora) / 1000));
  return { estado, segundosParaReligar: segundos };
}
