import type { TipoFachada } from "@/lib/dominio";

export interface Material {
  id: string;
  nome: string;
  tipo: TipoFachada;
  espessura: number; // mm
  kgM2: number; // peso aproximado
  cor: string;
  acabamento: string;
}

/** Catálogo de materiais correntes na Torre Dupla. */
export const MATERIAIS = {
  acmPrata: { id: "acmPrata", nome: "ACM 4mm Prata Mate", tipo: "ACM", espessura: 4, kgM2: 7.6, cor: "Prata Metalizado", acabamento: "Mate" },
  acmAntracite: { id: "acmAntracite", nome: "ACM 4mm Antracite", tipo: "ACM", espessura: 4, kgM2: 7.6, cor: "Antracite RAL 7016", acabamento: "Mate" },
  acmBranco: { id: "acmBranco", nome: "ACM 4mm Branco RAL9010", tipo: "ACM", espessura: 4, kgM2: 7.6, cor: "Branco Puro RAL 9010", acabamento: "Brilhante" },
  acmCinza: { id: "acmCinza", nome: "ACM 3mm Cinza RAL7035", tipo: "ACM", espessura: 3, kgM2: 5.9, cor: "Cinza Luz RAL 7035", acabamento: "Acetinado" },
  hplBranco: { id: "hplBranco", nome: "HPL 10mm Branco", tipo: "HPL", espessura: 10, kgM2: 14.0, cor: "Branco Puro", acabamento: "Liso" },
  hplMadeira: { id: "hplMadeira", nome: "HPL 8mm Carvalho Natural", tipo: "HPL", espessura: 8, kgM2: 11.2, cor: "Carvalho Natural", acabamento: "Texturado" },
  grcBeige: { id: "grcBeige", nome: "GRC 30mm Beige", tipo: "GRC", espessura: 30, kgM2: 60.0, cor: "Beige Areia", acabamento: "Areado" },
  alucobondBronze: { id: "alucobondBronze", nome: "ALUCOBOND 4mm Bronze", tipo: "ALUCOBOND", espessura: 4, kgM2: 7.6, cor: "Bronze Anodizado", acabamento: "Escovado" },
  vitrocsaVidro: { id: "vitrocsaVidro", nome: "VITROCSA Vidro 8+8mm", tipo: "VITROCSA", espessura: 16, kgM2: 40.0, cor: "Incolor", acabamento: "Laminado" },
} as const satisfies Record<string, Material>;

export type MaterialId = keyof typeof MATERIAIS;

export const LISTA_MATERIAIS: Material[] = Object.values(MATERIAIS);

export function materialPorId(id: string): Material | undefined {
  return (MATERIAIS as Record<string, Material>)[id];
}
