import "server-only";
import bwipjs from "bwip-js/node";
import QRCode from "qrcode";

/**
 * Conteúdo do QR Code de uma chapa.
 * - "json" (por omissão): payload JSON minificado da especificação (c, of, ob, cl, z, d, m, url).
 * - "url": URL absoluto da ficha de rastreabilidade — abre directamente na câmara do telemóvel.
 */
export function conteudoQR(chapa: { codigo: string; qrCodeData: string }, origem?: string) {
  if (process.env.QR_CONTEUDO === "url") {
    const base = (process.env.APP_URL || origem || "http://localhost:3000").replace(/\/$/, "");
    return `${base}/rastreabilidade/${chapa.codigo}`;
  }
  return chapa.qrCodeData;
}

/**
 * Origem pública do pedido actual (ex.: http://192.168.1.50:3000) — o endereço pelo
 * qual o tablet/PC abriu a aplicação, que é também o que os telemóveis conseguem abrir.
 */
export async function origemPedido(req?: Request): Promise<string> {
  const h = req?.headers ?? (await (await import("next/headers")).headers());
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (req ? new URL(req.url).protocol.replace(":", "") : "http");
  return `${proto}://${host}`;
}

/** QR Code em PNG (data URL), correcção de erros M — tolera etiquetas riscadas em fábrica. */
export function qrPngDataUrl(texto: string, larguraPx = 600) {
  return QRCode.toDataURL(texto, { errorCorrectionLevel: "M", margin: 0, width: larguraPx, color: { dark: "#000000", light: "#ffffff" } });
}

export function qrSvg(texto: string) {
  return QRCode.toString(texto, { type: "svg", errorCorrectionLevel: "M", margin: 0 });
}

/** Código de barras Code 128 em PNG (data URL). */
export async function code128PngDataUrl(texto: string) {
  const png = await bwipjs.toBuffer({ bcid: "code128", text: texto, scale: 4, height: 12, includetext: false, backgroundcolor: "FFFFFF" });
  return `data:image/png;base64,${png.toString("base64")}`;
}

export function code128Svg(texto: string) {
  return bwipjs.toSVG({ bcid: "code128", text: texto, height: 12, includetext: false });
}
