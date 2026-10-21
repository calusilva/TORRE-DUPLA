import { z } from "zod";
import { obterDadosDashboard, versaoObra } from "@/lib/servicos/dashboard";
import { utilizadorActual } from "@/lib/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTERVALO_DASHBOARD_MS = 5_000;
const INTERVALO_OBRA_MS = 2_000;
const HEARTBEAT_MS = 15_000;

const canalSchema = z.union([z.literal("dashboard"), z.string().regex(/^obra:[0-9a-f-]{36}$/)]);

/**
 * Server-Sent Events.
 *  - canal=dashboard → evento "dashboard" com o instantâneo completo (a cada 5 s, só se mudou)
 *  - canal=obra:<id> → evento "versao" quando alguma chapa da obra muda (verificação a cada 2 s)
 */
export async function GET(req: Request) {
  const user = await utilizadorActual();
  if (!user || "invalido" in user) return new Response("Não autenticado", { status: 401 });

  const parsed = canalSchema.safeParse(new URL(req.url).searchParams.get("canal"));
  if (!parsed.success) return new Response("Canal inválido", { status: 400 });
  const canal = parsed.data;

  const encoder = new TextEncoder();
  let ultimo = "";
  let timer: ReturnType<typeof setInterval> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let aCorrer = false;

  const stream = new ReadableStream({
    async start(controller) {
      const enviar = (evento: string, dados: string) => controller.enqueue(encoder.encode(`event: ${evento}\ndata: ${dados}\n\n`));
      const terminar = () => {
        clearInterval(timer);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* já fechado */
        }
      };

      async function tick() {
        if (aCorrer) return; // evita consultas sobrepostas se a BD estiver lenta
        aCorrer = true;
        try {
          if (canal === "dashboard") {
            const dados = await obterDadosDashboard();
            const assinatura = JSON.stringify({ ...dados, geradoEm: undefined });
            if (assinatura !== ultimo) {
              ultimo = assinatura;
              enviar("dashboard", JSON.stringify(dados));
            }
          } else {
            const v = await versaoObra(canal.slice(5));
            if (v !== ultimo) {
              ultimo = v;
              enviar("versao", v);
            }
          }
        } catch (e) {
          console.error("SSE", e);
          enviar("erro", JSON.stringify({ mensagem: "Erro ao obter dados" }));
        } finally {
          aCorrer = false;
        }
      }

      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      await tick();
      timer = setInterval(tick, canal === "dashboard" ? INTERVALO_DASHBOARD_MS : INTERVALO_OBRA_MS);
      heartbeat = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), HEARTBEAT_MS);
      req.signal.addEventListener("abort", terminar);
    },
    cancel() {
      clearInterval(timer);
      clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
