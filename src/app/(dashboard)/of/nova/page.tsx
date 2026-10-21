import type { Metadata } from "next";
import { asc, ne } from "drizzle-orm";
import { criarOF } from "@/app/actions/ofs";
import { PageHeader } from "@/components/comum/page-header";
import { OFForm } from "@/components/of/of-form";
import { db } from "@/db";
import { obras } from "@/db/schema";
import { utilizadoresPorPerfil } from "@/lib/queries";
import { exigirPerfil } from "@/lib/sessao";

export const metadata: Metadata = { title: "Nova OF" };

export default async function NovaOFPage({ searchParams }: { searchParams: Promise<{ obraId?: string }> }) {
  await exigirPerfil(["admin", "encarregado"]);
  const { obraId } = await searchParams;
  const [listaObras, responsaveis] = await Promise.all([
    db
      .select({ id: obras.id, codigo: obras.codigo, nome: obras.nome, tipoFachada: obras.tipoFachada })
      .from(obras)
      .where(ne(obras.estado, "concluida"))
      .orderBy(asc(obras.codigo)),
    utilizadoresPorPerfil(["operador", "encarregado"]),
  ]);

  const obraOrigem = listaObras.find((o) => o.id === obraId);

  return (
    <>
      <PageHeader
        titulo="Nova ordem de fabrico"
        voltar={
          obraOrigem ? { href: `/obras/${obraOrigem.id}`, label: `${obraOrigem.codigo} · ${obraOrigem.nome}` } : { href: "/of", label: "Ordens de Fabrico" }
        }
      />
      <OFForm accao={criarOF} obras={listaObras} obraIdInicial={obraId} responsaveis={responsaveis} />
    </>
  );
}
