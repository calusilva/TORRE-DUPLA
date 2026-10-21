"use server";

import { obterDadosDashboard } from "@/lib/servicos/dashboard";
import { exigirSessao } from "@/lib/sessao";

/** Actualização manual do dashboard (botão), independente do SSE. */
export async function actualizarDashboard() {
  await exigirSessao();
  return obterDadosDashboard();
}
