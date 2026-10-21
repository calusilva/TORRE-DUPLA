import type { Metadata } from "next";
import { PageHeader } from "@/components/comum/page-header";
import { PesquisaRastreabilidade } from "@/components/chapas/pesquisa-rastreabilidade";
import { exigirSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Rastreabilidade" };

export default async function RastreabilidadeIndex() {
  await exigirSessao();
  return (
    <div className="max-w-2xl">
      <PageHeader titulo="Rastreabilidade" descricao="Histórico completo de uma chapa, do corte à instalação. É a mesma página pública que abre ao ler o QR Code da etiqueta." />
      <PesquisaRastreabilidade />
    </div>
  );
}
