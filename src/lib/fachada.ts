// Geometria da fachada: converte uma grelha (larguras × alturas em mm) em chapas
// posicionadas para o layout visual. Usado pelo seed e pela geração em lote de OFs.

/** Escala do layout visual: 1 mm = 0,1 px. */
export const ESCALA_LAYOUT = 0.1;
/** Junta entre chapas no layout (px). */
export const JUNTA_PX = 2;
/** Afastamento entre lotes distintos na mesma zona (px). */
export const AFASTAMENTO_LOTE_PX = 24;

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** A, B, …, Z, AA, AB, … */
export function letraColuna(indice: number): string {
  let n = indice;
  let s = "";
  do {
    s = LETRAS[n % 26] + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export interface GrelhaZona {
  zona: string;
  /** Largura (mm) de cada coluna, da esquerda para a direita. */
  larguras: number[];
  /** Altura (mm) de cada fila, de cima para baixo. */
  alturas: number[];
  /** Piso da fila inferior. */
  pisoBase?: number;
}

export interface ChapaPlaneada {
  seq: number;
  zona: string;
  largura: number;
  altura: number;
  piso: number;
  coluna: string;
  linha: number; // 1 = fila inferior
  posicaoX: number;
  posicaoY: number;
}

/**
 * Gera as chapas de uma grelha. A sequência segue a ordem de montagem
 * (de baixo para cima, da esquerda para a direita); as coordenadas são em px
 * com origem no canto superior esquerdo da zona.
 */
export function planearGrelha(
  g: GrelhaZona,
  opcoes: { seqInicial?: number; offsetX?: number; offsetY?: number; colunaInicial?: number } = {},
): ChapaPlaneada[] {
  const { seqInicial = 1, offsetX = 0, offsetY = 0, colunaInicial = 0 } = opcoes;
  const filas = g.alturas.length;

  const ys: number[] = [];
  let y = offsetY;
  for (const a of g.alturas) {
    ys.push(y);
    y += a * ESCALA_LAYOUT + JUNTA_PX;
  }
  const xs: number[] = [];
  let x = offsetX;
  for (const l of g.larguras) {
    xs.push(x);
    x += l * ESCALA_LAYOUT + JUNTA_PX;
  }

  const resultado: ChapaPlaneada[] = [];
  let seq = seqInicial;
  for (let fila = filas - 1; fila >= 0; fila--) {
    g.larguras.forEach((largura, col) => {
      resultado.push({
        seq: seq++,
        zona: g.zona,
        largura,
        altura: g.alturas[fila],
        piso: (g.pisoBase ?? 1) + (filas - 1 - fila),
        coluna: letraColuna(colunaInicial + col),
        linha: filas - fila,
        posicaoX: round2(xs[col]),
        posicaoY: round2(ys[fila]),
      });
    });
  }
  return resultado;
}

/** Dimensões totais (px) de uma grelha no layout. */
export function dimensoesGrelha(g: Pick<GrelhaZona, "larguras" | "alturas">) {
  const soma = (v: number[]) => v.reduce((a, b) => a + b * ESCALA_LAYOUT, 0) + Math.max(0, v.length - 1) * JUNTA_PX;
  return { largura: soma(g.larguras), altura: soma(g.alturas) };
}

/**
 * Converte um padrão de texto ("1200, 900x2, 600") numa lista de medidas.
 * Aceita "medida" ou "medidaxN" para repetir. Devolve null se inválido.
 */
export function interpretarPadrao(texto: string): number[] | null {
  const partes = texto.split(/[,;\s]+/).filter(Boolean);
  if (!partes.length) return null;
  const out: number[] = [];
  for (const p of partes) {
    const m = /^(\d+(?:[.,]\d+)?)(?:[x×*](\d+))?$/i.exec(p);
    if (!m) return null;
    const v = Number(m[1].replace(",", "."));
    const n = m[2] ? Number(m[2]) : 1;
    if (!(v > 0) || n < 1 || n > 200) return null;
    for (let i = 0; i < n; i++) out.push(v);
  }
  return out;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
