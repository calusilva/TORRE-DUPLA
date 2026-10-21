import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { chapas } from "@/db/schema";
import { exigirSessao } from "@/lib/sessao";

/** Atalho /chapas/:id (ou /chapas/:codigo) → ficha da chapa dentro da sua OF. */
export default async function AtalhoChapa({ params }: { params: Promise<{ chapaId: string }> }) {
  await exigirSessao();
  const { chapaId } = await params;
  const porId = z.uuid().safeParse(chapaId).success;
  const [c] = await db
    .select({ id: chapas.id, ofId: chapas.ofId })
    .from(chapas)
    .where(porId ? eq(chapas.id, chapaId) : eq(chapas.codigo, decodeURIComponent(chapaId).toUpperCase()));
  if (!c) notFound();
  redirect(`/of/${c.ofId}/chapas/${c.id}`);
}
