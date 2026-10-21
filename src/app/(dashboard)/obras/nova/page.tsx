import type { Metadata } from "next";
import { criarObra } from "@/app/actions/obras";
import { PageHeader } from "@/components/comum/page-header";
import { ObraForm } from "@/components/obras/obra-form";
import { utilizadoresPorPerfil } from "@/lib/queries";
import { exigirPerfil } from "@/lib/sessao";

export const metadata: Metadata = { title: "Nova obra" };

export default async function NovaObraPage() {
  await exigirPerfil(["admin", "encarregado"]);
  const encarregados = await utilizadoresPorPerfil(["encarregado"]);
  return (
    <>
      <PageHeader titulo="Nova obra" voltar={{ href: "/obras", label: "Obras" }} />
      <ObraForm accao={criarObra} encarregados={encarregados} />
    </>
  );
}
