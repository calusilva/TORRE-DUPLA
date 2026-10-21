"use client";

import { toast } from "sonner";

export const TIMEOUT_ACCAO_MS = 12_000;

export class ErroTimeout extends Error {
  constructor() {
    super("O servidor demorou demasiado a responder.");
  }
}

/** Rejeita se a server action não responder a tempo (rede instável no chão de fábrica). */
export function comTimeout<T>(promessa: Promise<T>, ms = TIMEOUT_ACCAO_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new ErroTimeout()), ms);
    promessa.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Mensagem para falhas de rede/timeout (as falhas de negócio vêm no resultado da acção). */
export function mensagemFalha(e: unknown) {
  return e instanceof ErroTimeout ? "Sem resposta do servidor (timeout)." : "Sem ligação ao servidor.";
}

/** Toast de erro com botão "Tentar novamente" quando a falha é de rede. */
export function toastFalhaRede(e: unknown, tentarNovamente: () => void) {
  toast.error(mensagemFalha(e), {
    description: "Verifique a rede e tente de novo.",
    duration: 12_000,
    action: { label: "Tentar novamente", onClick: tentarNovamente },
  });
}

/** Pede à sidebar que actualize já os badges (sem esperar pelo polling de 30 s). */
export function actualizarContadores() {
  window.dispatchEvent(new Event("contadores:actualizar"));
}
