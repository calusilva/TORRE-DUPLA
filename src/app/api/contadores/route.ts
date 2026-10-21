import { obterContadores } from "@/lib/consultas/contadores";
import { utilizadorActual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/** GET /api/contadores — badges da sidebar (polling leve a cada 30 s). */
export async function GET() {
  const user = await utilizadorActual();
  if (!user || "invalido" in user) return Response.json({ erro: "Não autenticado" }, { status: 401 });
  return Response.json(await obterContadores(), { headers: { "Cache-Control": "no-store" } });
}
