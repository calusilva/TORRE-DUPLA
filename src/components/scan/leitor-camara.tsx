"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff, Flashlight, Loader2 } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";
import { cn } from "@/lib/utils";

/**
 * Leitura contínua por câmara (QR Code e Code 128) com @zxing/browser.
 * Quando `activo` é falso a câmara é libertada (poupa bateria nos tablets).
 */
export function LeitorCamara({ activo, onLeitura }: { activo: boolean; onLeitura: (texto: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const callback = useRef(onLeitura);
  const [estado, setEstado] = useState<"a_iniciar" | "activo" | "erro">("a_iniciar");
  const [erro, setErro] = useState<string | null>(null);
  const [lanterna, setLanterna] = useState<boolean | null>(null);

  useEffect(() => {
    callback.current = onLeitura;
  }, [onLeitura]);

  useEffect(() => {
    if (!activo) return;
    let cancelado = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstado("erro");
        setErro(window.isSecureContext ? "Este dispositivo não disponibiliza câmara." : "A câmara exige ligação segura (HTTPS). Use o leitor USB ou a introdução manual.");
        return;
      }
      setEstado("a_iniciar");
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
        const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128]]]);
        const leitor = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 1500 });
        const c = await leitor.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          video.current!,
          (resultado) => {
            if (resultado) callback.current(resultado.getText());
          },
        );
        if (cancelado) {
          c.stop();
          return;
        }
        controls.current = c;
        setLanterna(c.switchTorch ? false : null);
        setEstado("activo");
      } catch (e) {
        if (cancelado) return;
        setEstado("erro");
        const nome = e instanceof DOMException ? e.name : "";
        setErro(
          nome === "NotAllowedError"
            ? "Acesso à câmara recusado. Autorize nas definições do navegador."
            : nome === "NotFoundError"
              ? "Nenhuma câmara encontrada."
              : "Não foi possível iniciar a câmara.",
        );
      }
    })();

    return () => {
      cancelado = true;
      controls.current?.stop();
      controls.current = null;
    };
  }, [activo]);

  async function alternarLanterna() {
    if (!controls.current?.switchTorch) return;
    await controls.current.switchTorch(!lanterna);
    setLanterna(!lanterna);
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-950">
      <video ref={video} className={cn("size-full object-cover", estado !== "activo" && "opacity-0")} muted playsInline />

      {estado === "activo" && activo && (
        <>
          {/* Moldura e linha de scan */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative aspect-square w-[58%] rounded-2xl shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]">
              {["left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl", "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-2xl", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl"].map((c) => (
                <span key={c} className={cn("absolute size-8 border-white", c)} />
              ))}
              <span className="absolute inset-x-3 h-0.5 animate-[scanline_2.2s_ease-in-out_infinite] rounded-full bg-amber-400 shadow-[0_0_12px_2px_rgba(251,191,36,0.7)]" />
            </div>
          </div>
          <p className="absolute inset-x-0 bottom-3 text-center text-sm font-medium text-white/90">Aponte para o QR Code da etiqueta</p>
          {lanterna !== null && (
            <button type="button" onClick={alternarLanterna} className={cn("absolute right-3 top-3 rounded-full p-2.5", lanterna ? "bg-amber-400 text-black" : "bg-black/50 text-white")} aria-label="Lanterna">
              <Flashlight className="size-5" />
            </button>
          )}
        </>
      )}

      {estado === "a_iniciar" && activo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
          <Loader2 className="size-7 animate-spin" />
          <span className="text-sm">A iniciar câmara…</span>
        </div>
      )}
      {estado === "erro" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white/90">
          <CameraOff className="size-8 text-white/60" />
          <p className="max-w-xs text-sm">{erro}</p>
        </div>
      )}
      {!activo && estado !== "erro" && <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Câmara em pausa</div>}
    </div>
  );
}
