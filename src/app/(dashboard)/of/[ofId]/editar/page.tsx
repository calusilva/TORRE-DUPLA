import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { actualizarOF } from "@/app/actions/ofs";
import { PageHeader } from "@/components/comum/page-header";
import { OFForm } from "@/components/of/of-form";
import { obterOF, utilizadoresPorPerfil } from "@/lib/queries";
import { exigirPerfil } from "@/lib/sessao";

export const metadata: Metadata = { title: "Editar OF" };

export default async function EditarOFPage({ params }: { params: Promise<{ ofId: string }> }) {
  await exigirPerfil(["admin", "encarregado"]);
  const { ofId } = await params;
  const [dados, responsaveis] = await Promise.all([obterOF(ofId).catch(() => null), utilizadoresPorPerfil(["operador", "encarregado"])]);
  if (!dados) notFound();

  return (
    <>
      <PageHeader titulo={`Editar ${dados.of.numero}`} voltar={{ href: `/of/${ofId}`, label: dados.of.numero }} />
      <OFForm
        accao={actualizarOF.bind(null, ofId)}
        of={dados.of}
        obras={[{ id: dados.obra.id, codigo: dados.obra.codigo, nome: dados.obra.nome, tipoFachada: dados.obra.tipoFachada }]}
        responsaveis={responsaveis}
      />
    </>
  );
}
