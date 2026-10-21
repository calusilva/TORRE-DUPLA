import { readFile } from "node:fs/promises";
import path from "node:path";
import { dirUploads } from "@/lib/servicos/fotos";
import { utilizadorActual } from "@/lib/sessao";

export const runtime = "nodejs";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Fotos de não conformidades (apenas utilizadores autenticados). */
export async function GET(_req: Request, { params }: { params: Promise<{ nome: string }> }) {
  const user = await utilizadorActual();
  if (!user || "invalido" in user) return new Response("Não autenticado", { status: 401 });

  const { nome } = await params;
  const m = /^[0-9a-f-]{36}\.(jpg|png|webp)$/.exec(nome);
  if (!m) return new Response("Ficheiro inválido", { status: 400 });
  try {
    const ficheiro = await readFile(path.join(dirUploads(), "nc", nome));
    return new Response(new Uint8Array(ficheiro), { headers: { "Content-Type": MIME[m[1]], "Cache-Control": "private, max-age=31536000, immutable" } });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
