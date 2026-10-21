import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { etiquetasImpressas } from "@/db/schema";
import { EtiquetasDocumento, type DadosEtiqueta, type FormatoEtiqueta } from "@/components/pdf/etiquetas-pdf";
import { code128PngDataUrl, conteudoQR, qrPngDataUrl } from "@/lib/qr";
import { chapasParaEtiqueta } from "@/lib/queries";

export const MAX_ETIQUETAS_POR_PDF = 1000;

const NOME_FORMATO: Record<FormatoEtiqueta, string> = {
  A4_4por_pagina: "A4 (4 por página)",
  A6_individual: "A6 individual",
  rolo: "Rolo 100×70 mm",
};

/**
 * Gera o PDF de etiquetas das chapas indicadas e regista a impressão
 * (marcando reimpressões quando a chapa já tinha etiqueta).
 */
export async function gerarPdfEtiquetas(params: {
  chapaIds: string[];
  formato: FormatoEtiqueta;
  incluirBarcode: boolean;
  utilizadorId: string;
}) {
  const chapas = await chapasParaEtiqueta(params.chapaIds);
  if (!chapas.length) return null;

  const dados: DadosEtiqueta[] = await Promise.all(
    chapas.map(async (c) => ({
      codigo: c.codigo,
      numeroOf: c.numeroOf,
      codigoObra: c.codigoObra,
      nomeObra: c.nomeObra,
      cliente: c.cliente,
      zona: c.zona,
      piso: c.piso,
      coluna: c.coluna,
      largura: c.largura,
      altura: c.altura,
      m2: c.m2,
      peso: c.peso,
      material: c.material,
      qrPng: await qrPngDataUrl(conteudoQR(c)),
      barcodePng: params.incluirBarcode ? await code128PngDataUrl(c.codigo) : undefined,
    })),
  );

  const pdf = await renderToBuffer(<EtiquetasDocumento etiquetas={dados} formato={params.formato} />);

  const jaImpressas = new Set(
    (
      await db
        .selectDistinct({ chapaId: etiquetasImpressas.chapaId })
        .from(etiquetasImpressas)
        .where(inArray(etiquetasImpressas.chapaId, chapas.map((c) => c.id)))
    ).map((r) => r.chapaId),
  );
  await db.insert(etiquetasImpressas).values(
    chapas.map((c) => ({
      chapaId: c.id,
      impressaPorId: params.utilizadorId,
      impressora: `PDF — ${NOME_FORMATO[params.formato]}`,
      formato: params.formato === "A6_individual" ? "A6" : params.formato === "rolo" ? "rolo" : "A4",
      reimpressao: jaImpressas.has(c.id),
    })),
  );

  const nome = chapas.length === 1 ? `etiqueta-${chapas[0].codigo}.pdf` : `etiquetas-${chapas[0].numeroOf}-${chapas.length}.pdf`;
  return { pdf, nome, quantidade: chapas.length };
}

export function respostaPdf(pdf: Buffer, nome: string) {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
