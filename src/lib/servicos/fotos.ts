import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function dirUploads() {
  return path.resolve(process.env.UPLOAD_DIR ?? "/tmp/gs-erp-uploads");
}

/** Grava uma foto enviada como data URL e devolve o URL público interno. */
export async function guardarFoto(dataUrl: string): Promise<string> {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("Formato de imagem não suportado (use JPEG, PNG ou WebP).");
  const buffer = Buffer.from(m[2], "base64");
  const max = Number(process.env.MAX_FILE_SIZE ?? 5 * 1024 * 1024);
  if (buffer.length > max) throw new Error(`A foto excede ${Math.round(max / 1024 / 1024)} MB.`);

  const nome = `${crypto.randomUUID()}.${TIPOS[m[1]]}`;
  const dir = path.join(dirUploads(), "nc");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, nome), buffer);
  return `/api/fotos/${nome}`;
}
