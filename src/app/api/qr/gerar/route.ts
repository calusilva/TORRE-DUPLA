import { z } from "zod";
import { origemPedido } from "@/lib/qr";
import { utilizadorActual } from "@/lib/sessao";
import { gerarPdfEtiquetas, MAX_ETIQUETAS_POR_PDF, respostaPdf } from "@/lib/servicos/etiquetas";

export const runtime = "nodejs";

const pedido = z.object({
  chapaIds: z.array(z.uuid()).min(1, "Seleccione pelo menos uma chapa").max(MAX_ETIQUETAS_POR_PDF, `Máximo de ${MAX_ETIQUETAS_POR_PDF} etiquetas por PDF`),
  formato: z.enum(["A4_4por_pagina", "A6_individual", "rolo"]),
  incluirBarcode: z.boolean().default(true),
});

/** POST /api/qr/gerar — PDF com etiquetas em lote (QR Code + Code 128). */
export async function POST(req: Request) {
  const user = await utilizadorActual();
  if (!user || "invalido" in user) return Response.json({ erro: "Não autenticado" }, { status: 401 });

  const body = pedido.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ erro: body.error.issues[0]?.message ?? "Pedido inválido" }, { status: 400 });

  try {
    const r = await gerarPdfEtiquetas({ ...body.data, utilizadorId: user.id, origem: await origemPedido(req) });
    if (!r) return Response.json({ erro: "Nenhuma chapa encontrada" }, { status: 404 });
    return respostaPdf(r.pdf, r.nome);
  } catch (e) {
    console.error(e);
    return Response.json({ erro: "Não foi possível gerar o PDF de etiquetas" }, { status: 500 });
  }
}
