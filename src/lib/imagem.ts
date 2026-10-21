/** Redimensiona e comprime uma imagem no browser (fotos de telemóvel têm 3–8 MB). */
export async function comprimirImagem(ficheiro: File, maxLado = 1280, qualidade = 0.8): Promise<string> {
  const bitmap = await createImageBitmap(ficheiro);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", qualidade);
}
