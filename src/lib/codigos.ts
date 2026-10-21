export function gerarCodigoChapa(params: {
  ano: number;
  mes: number;
  numeroOf: string; // "0089"
  sequencia: number; // 1, 2, 3...
}): string {
  const anoMes = `${String(params.ano).slice(-2)}${String(params.mes).padStart(2, "0")}`;
  const seq = String(params.sequencia).padStart(4, "0");
  return `TD-${anoMes}-${params.numeroOf}-${seq}`; // TD-2410-0089-0001
}

// "OF-2024-0089" → "0089"
export function sufixoOf(numeroOf: string): string {
  return numeroOf.split("-").at(-1) ?? numeroOf;
}

// Dados codificados no QR Code (JSON minificado).
export interface QRCodePayload {
  c: string; // código da chapa
  of: string; // número OF
  ob: string; // código obra
  cl: string; // cliente
  z: string; // zona
  d: string; // dimensões "1200x600"
  m: string; // material
  url: string; // link rastreabilidade
}

export function gerarPayloadQR(dados: {
  codigo: string;
  numeroOf: string;
  codigoObra: string;
  cliente: string;
  zona: string | null;
  largura: number;
  altura: number;
  material: string | null;
}): string {
  const payload: QRCodePayload = {
    c: dados.codigo,
    of: dados.numeroOf,
    ob: dados.codigoObra,
    cl: dados.cliente,
    z: dados.zona ?? "",
    d: `${dados.largura}x${dados.altura}`,
    m: dados.material ?? "",
    url: `/rastreabilidade/${dados.codigo}`,
  };
  return JSON.stringify(payload);
}

export function calcularM2(larguraMm: number, alturaMm: number): number {
  return (larguraMm * alturaMm) / 1_000_000;
}

const RE_CODIGO = /TD-\d{4}-\d{4}-\d{4}/i;

/**
 * Extrai o código da chapa de uma leitura: payload JSON do QR, URL de
 * rastreabilidade, Code 128 ou introdução manual. Devolve null se não reconhecer.
 */
export function extrairCodigoChapa(leitura: string): string | null {
  const texto = leitura.trim();
  if (!texto) return null;
  if (texto.startsWith("{")) {
    try {
      const p = JSON.parse(texto) as Partial<QRCodePayload>;
      if (p.c && RE_CODIGO.test(p.c)) return p.c.toUpperCase();
    } catch {
      /* não é JSON válido — tenta os outros formatos */
    }
  }
  const url = /\/rastreabilidade\/([^/?#\s]+)/i.exec(texto);
  if (url) return decodeURIComponent(url[1]).toUpperCase();
  // Leitores USB com teclado não-PT podem trocar "-" por "'" ou "/".
  const normalizado = texto.replace(/['/_]/g, "-");
  return RE_CODIGO.exec(normalizado)?.[0].toUpperCase() ?? null;
}
