"use server";

import { count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { obras, ordensFabrico } from "@/db/schema";
import { exigirPerfil } from "@/lib/sessao";
import { errosPorCampo, obraSchema, type ResultadoAccao } from "@/lib/validacao";

const GESTAO = ["admin", "encarregado"] as const;

function lerObra(formData: FormData) {
  return obraSchema.safeParse(Object.fromEntries(formData));
}

export async function criarObra(_prev: unknown, formData: FormData): Promise<ResultadoAccao<{ id: string; codigo: string }>> {
  await exigirPerfil([...GESTAO]);
  const parsed = lerObra(formData);
  if (!parsed.success) return { ok: false, erro: "Verifique os campos assinalados.", campos: errosPorCampo(parsed.error) };
  const d = parsed.data;

  try {
    const obra = await db.transaction(async (tx) => {
      // Serializa a atribuição de códigos TD-AAAA-NNN.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('codigo_obra'))`);
      const ano = new Date().getFullYear();
      const [{ maxN }] = await tx
        .select({ maxN: sql<number>`coalesce(max(split_part(${obras.codigo}, '-', 3)::int), 0)::int` })
        .from(obras)
        .where(sql`${obras.codigo} like ${`TD-${ano}-%`}`);
      const codigo = `TD-${ano}-${String(maxN + 1).padStart(3, "0")}`;

      const [nova] = await tx
        .insert(obras)
        .values({
          codigo,
          nome: d.nome,
          cliente: d.cliente,
          localObra: d.localObra ?? null,
          tipoFachada: d.tipoFachada,
          totalM2: d.totalM2.toFixed(2),
          dataInicioProducao: d.dataInicioProducao ?? null,
          dataEntregaPrevista: d.dataEntregaPrevista ?? null,
          estado: d.estado ?? "planeamento",
          encarregadoId: d.encarregadoId ?? null,
          observacoes: d.observacoes ?? null,
        })
        .returning({ id: obras.id, codigo: obras.codigo });
      return nova;
    });
    revalidatePath("/obras");
    return { ok: true, mensagem: `Obra ${obra.codigo} criada`, dados: obra };
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível criar a obra." };
  }
}

export async function actualizarObra(id: string, _prev: unknown, formData: FormData): Promise<ResultadoAccao<{ id: string; codigo: string }>> {
  await exigirPerfil([...GESTAO]);
  const parsed = lerObra(formData);
  if (!parsed.success) return { ok: false, erro: "Verifique os campos assinalados.", campos: errosPorCampo(parsed.error) };
  const d = parsed.data;

  const [obra] = await db
    .update(obras)
    .set({
      nome: d.nome,
      cliente: d.cliente,
      localObra: d.localObra ?? null,
      tipoFachada: d.tipoFachada,
      totalM2: d.totalM2.toFixed(2),
      dataInicioProducao: d.dataInicioProducao ?? null,
      dataEntregaPrevista: d.dataEntregaPrevista ?? null,
      ...(d.estado && { estado: d.estado }),
      ...(d.estado === "concluida" && { dataEntregaReal: sql`coalesce(${obras.dataEntregaReal}, current_date)` }),
      encarregadoId: d.encarregadoId ?? null,
      observacoes: d.observacoes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(obras.id, id))
    .returning({ id: obras.id, codigo: obras.codigo });
  if (!obra) return { ok: false, erro: "Obra não encontrada." };

  revalidatePath("/obras");
  revalidatePath(`/obras/${id}`);
  return { ok: true, mensagem: `Obra ${obra.codigo} actualizada`, dados: obra };
}

export async function eliminarObra(id: string): Promise<ResultadoAccao> {
  await exigirPerfil([...GESTAO]);
  const [{ n }] = await db.select({ n: count() }).from(ordensFabrico).where(eq(ordensFabrico.obraId, id));
  if (n > 0) return { ok: false, erro: `A obra tem ${n} OF(s) associada(s) e não pode ser eliminada.` };

  const [apagada] = await db.delete(obras).where(eq(obras.id, id)).returning({ codigo: obras.codigo });
  if (!apagada) return { ok: false, erro: "Obra não encontrada." };
  revalidatePath("/obras");
  return { ok: true, mensagem: `Obra ${apagada.codigo} eliminada` };
}
