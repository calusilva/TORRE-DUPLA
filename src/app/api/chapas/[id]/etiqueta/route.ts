import { z } from "zod";
import { origemPedido } from "@/lib/qr";
import { utilizadorActual } from "@/lib/sessao";
import { gerarPdfEtiquetas, respostaPdf } from "@/lib/servicos/etiquetas";

export const runtime = "nodejs";

const query = z.object({
  formato: z.enum(["A6_individual", "A4_4por_pagina", "rolo"]).default("A6_individual"),
  barcode: z.enum(["0", "1"]).default("1"),
});

/** GET /api/chapas/:id/etiqueta?formato=A6_individual — PDF da etiqueta de uma chapa. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await utilizadorActual();
  if (!user || "invalido" in user) return Response.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ erro: "Chapa inválida" }, { status: 400 });
  const q = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return Response.json({ erro: "Parâmetros inválidos" }, { status: 400 });

  try {
    const r = await gerarPdfEtiquetas({ chapaIds: [id], formato: q.data.formato, incluirBarcode: q.data.barcode === "1", utilizadorId: user.id, origem: await origemPedido(req) });
    if (!r) return Response.json({ erro: "Chapa não encontrada" }, { status: 404 });
    return respostaPdf(r.pdf, r.nome);
  } catch (e) {
    console.error(e);
    return Response.json({ erro: "Não foi possível gerar a etiqueta" }, { status: 500 });
  }
}
