import type { Metadata } from "next";
import { DashboardProducao } from "@/components/producao/dashboard-producao";
import { obterDadosDashboard } from "@/lib/servicos/dashboard";
import { exigirSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Produção em tempo real" };
export const dynamic = "force-dynamic";

/** /producao?tv=1 ocupa o ecrã todo sem menu — para a TV do chão de fábrica em modo quiosque. */
export default async function ProducaoPage({ searchParams }: { searchParams: Promise<{ tv?: string }> }) {
  await exigirSessao();
  const { tv } = await searchParams;
  // Primeiro instantâneo renderizado no servidor; o SSE assume a partir daí.
  return <DashboardProducao inicial={await obterDadosDashboard()} modoTV={tv === "1"} />;
}
