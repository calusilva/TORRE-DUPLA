import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { actualizarObra } from "@/app/actions/obras";
import { PageHeader } from "@/components/comum/page-header";
import { ObraForm } from "@/components/obras/obra-form";
import { obterObra, utilizadoresPorPerfil } from "@/lib/queries";
import { exigirPerfil } from "@/lib/sessao";

export const metadata: Metadata = { title: "Editar obra" };

export default async function EditarObraPage({ params }: { params: Promise<{ obraId: string }> }) {
  await exigirPerfil(["admin", "encarregado"]);
  const { obraId } = await params;
  const [dados, encarregados] = await Promise.all([obterObra(obraId).catch(() => null), utilizadoresPorPerfil(["encarregado"])]);
  if (!dados) notFound();

  return (
    <>
      <PageHeader titulo={`Editar ${dados.obra.codigo}`} voltar={{ href: `/obras/${obraId}`, label: dados.obra.nome }} />
      <ObraForm accao={actualizarObra.bind(null, obraId)} obra={dados.obra} encarregados={encarregados} />
    </>
  );
}
