import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EstadoObraBadge } from "@/components/comum/estado-badges";
import { PageHeader, Vazio } from "@/components/comum/page-header";
import { LayoutVisual } from "@/components/layout-visual/layout-visual";
import { Button } from "@/components/ui/button";
import { chapasLayout, obterObra } from "@/lib/queries";
import { exigirPerfil } from "@/lib/sessao";

type Params = { params: Promise<{ obraId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { obraId } = await params;
  const d = await obterObra(obraId).catch(() => null);
  return { title: d ? `Layout — ${d.obra.nome}` : "Layout visual" };
}

export default async function LayoutVisualPage({ params }: Params) {
  const user = await exigirPerfil(["admin", "encarregado"]);
  const { obraId } = await params;
  const dados = await obterObra(obraId).catch(() => null);
  if (!dados) notFound();
  const chapas = await chapasLayout(obraId);

  return (
    <>
      <PageHeader
        voltar={{ href: `/obras/${obraId}`, label: dados.obra.nome }}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            Layout da fachada
            <EstadoObraBadge estado={dados.obra.estado} />
          </span>
        }
        descricao={
          <span>
            <span className="font-mono">{dados.obra.codigo}</span> · {dados.obra.nome} · {dados.obra.cliente}
          </span>
        }
      />
      {chapas.length === 0 ? (
        <Vazio
          titulo="Ainda não há chapas nesta obra"
          descricao="Crie uma OF e gere as chapas a partir da grelha da fachada para as ver aqui."
          accao={
            <Button asChild>
              <Link href={`/of/nova?obraId=${obraId}`}>Nova OF</Link>
            </Button>
          }
        />
      ) : (
        <LayoutVisual obraId={obraId} chapas={chapas} perfil={user.perfil} />
      )}
    </>
  );
}
