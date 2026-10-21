// Modelo de consumo teórico de materiais por chapa (simulação — sem integração Primavera).
// Usado no seed, nas reservas de stock, nos consumos por OF e nas saídas automáticas da produção.

/** Densidade do alumínio: 2,7 g/cm³ ⇒ 2,7 kg por m² por mm de espessura. */
export const DENSIDADE_ALUMINIO_KG_M2_MM = 2.7;
/** Factor de corte aplicado aos perfis (desperdício). */
export const FACTOR_CORTE_PERFIS = 1.2;
export const FIXACOES_POR_CHAPA = 8;
/** Tinta em pó por m² de face lacada. */
export const TINTA_KG_M2 = 0.12;

export const CODIGOS_MATERIAL = {
  aluminio15: "MAT-001",
  aluminio20: "MAT-002",
  perfis: "MAT-003",
  isolamento: "MAT-004",
  epdm: "MAT-005",
  fixacoes: "MAT-006",
  tinta9006: "MAT-007",
  tinta7016: "MAT-008",
} as const;
export type CodigoMaterial = (typeof CODIGOS_MATERIAL)[keyof typeof CODIGOS_MATERIAL];

export interface ChapaParaConsumo {
  largura: number | string; // mm
  altura: number | string; // mm
  espessura: number | string | null; // mm
  material: string | null;
  cor: string | null;
}

/** Revestimentos metálicos consomem chapa de alumínio e tinta; HPL/GRC/vidro não. */
function eMetalico(material: string | null) {
  return !!material && /^(ACM|ALUCOBOND)/i.test(material);
}

/** Consumo teórico de uma chapa, por código de material. */
export function consumoTeorico(c: ChapaParaConsumo): Partial<Record<CodigoMaterial, number>> {
  const l = Number(c.largura);
  const a = Number(c.altura);
  const e = Number(c.espessura ?? 0);
  const m2 = (l * a) / 1e6;
  const perimetro = (2 * (l + a)) / 1000; // ml

  const out: Partial<Record<CodigoMaterial, number>> = {
    [CODIGOS_MATERIAL.isolamento]: m2,
    [CODIGOS_MATERIAL.perfis]: perimetro * FACTOR_CORTE_PERFIS,
    [CODIGOS_MATERIAL.epdm]: perimetro,
    [CODIGOS_MATERIAL.fixacoes]: FIXACOES_POR_CHAPA,
  };
  if (eMetalico(c.material)) {
    // Chapas até 3 mm usam bobine de 1,5 mm; acima, 2,0 mm.
    out[e <= 3 ? CODIGOS_MATERIAL.aluminio15 : CODIGOS_MATERIAL.aluminio20] = m2 * e * DENSIDADE_ALUMINIO_KG_M2_MM;
    const cor = c.cor ?? "";
    if (/7016|antracite/i.test(cor)) out[CODIGOS_MATERIAL.tinta7016] = m2 * TINTA_KG_M2;
    else if (/9006|prata/i.test(cor)) out[CODIGOS_MATERIAL.tinta9006] = m2 * TINTA_KG_M2;
  }
  return out;
}

/** Soma o consumo teórico de várias chapas. */
export function somarConsumos(chapas: ChapaParaConsumo[]) {
  const total: Partial<Record<CodigoMaterial, number>> = {};
  for (const c of chapas) {
    for (const [cod, q] of Object.entries(consumoTeorico(c)) as [CodigoMaterial, number][]) {
      total[cod] = (total[cod] ?? 0) + q;
    }
  }
  return total;
}
