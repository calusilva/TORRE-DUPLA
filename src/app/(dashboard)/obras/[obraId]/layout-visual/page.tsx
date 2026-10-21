import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EstadoObraBadge } from "@/components/comum/estado-badges";
import { PageHeader, Vazio } from "@/components/comum/page-header";
import { LayoutVisual } from "@/components/layout-visual/layout-visual";
import { Button } from "@/components/ui/button";
import { chapasLayout, listarOFs, obterObra } from "@/lib/queries";
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
  const [chapas, ofs] = await Promise.all([chapasLayout(obraId), listarOFs({ obraId })]);
  const ofSemChapas = ofs.find((o) => o.total === 0 && o.of.estado !== "cancelada" && o.of.estado !== "concluida");

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
        ofSemChapas ? (
          <Vazio
            titulo={`A ${ofSemChapas.of.numero} ainda não tem chapas geradas`}
            descricao="Gere o lote a partir da grelha da fachada — cada chapa fica com código, QR Code e posição neste layout."
            accao={
              <Button asChild>
                <Link href={`/of/${ofSemChapas.of.id}?gerar=1`}>Gerar lote</Link>
              </Button>
            }
          />
        ) : (
          <Vazio
            titulo="Esta obra ainda não tem chapas geradas"
            descricao="Crie uma OF e gere o lote de chapas a partir da grelha da fachada para as ver aqui."
            accao={
              <Button asChild>
                <Link href={`/of/nova?obraId=${obraId}`}>Nova OF e gerar lote</Link>
              </Button>
            }
          />
        )
      ) : (
        <LayoutVisual obraId={obraId} chapas={chapas} perfil={user.perfil} />
      )}
    </>
  );
}
