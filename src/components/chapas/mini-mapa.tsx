import { CORES_ESTADO, type EstadoChapa } from "@/lib/dominio";

/** Mini-mapa da zona com a chapa actual destacada (posições X/Y do layout). */
export function MiniMapa({
  chapas,
  actualId,
}: {
  chapas: { id: string; estado: EstadoChapa; x: string | null; y: string | null; largura: string; altura: string }[];
  actualId: string;
}) {
  const rects = chapas
    .filter((c) => c.x !== null && c.y !== null)
    .map((c) => ({ ...c, x: Number(c.x), y: Number(c.y), w: Number(c.largura) * 0.1, h: Number(c.altura) * 0.1 }));
  if (!rects.length) return null;
  const maxX = Math.max(...rects.map((r) => r.x + r.w));
  const maxY = Math.max(...rects.map((r) => r.y + r.h));
  const actual = rects.find((r) => r.id === actualId);

  return (
    <svg viewBox={`-4 -4 ${maxX + 8} ${maxY + 8}`} className="h-auto max-h-48 w-full" role="img" aria-label="Localização da chapa na fachada">
      {rects.map((r) => (
        <rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h} rx={1} fill={CORES_ESTADO[r.estado]} opacity={r.id === actualId ? 1 : 0.45} />
      ))}
      {actual && (
        <rect x={actual.x - 2} y={actual.y - 2} width={actual.w + 4} height={actual.h + 4} rx={2} fill="none" className="stroke-foreground" strokeWidth={2.5}>
          <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
        </rect>
      )}
    </svg>
  );
}
