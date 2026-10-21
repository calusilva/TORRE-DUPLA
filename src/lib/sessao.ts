import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { utilizadores } from "@/db/schema";
import type { Perfil } from "@/lib/dominio";
import { PAGINA_INICIAL } from "@/lib/navegacao";

/**
 * Devolve o utilizador autenticado ou redirecciona para o login.
 * Confirma na BD que o utilizador ainda existe e está activo (o JWT pode
 * sobreviver a uma desactivação ou a um reset da BD).
 */
export const utilizadorActual = cache(async () => {
  const sessao = await auth();
  if (!sessao?.user?.id) return null;
  const [u] = await db
    .select({ id: utilizadores.id, nome: utilizadores.nome, email: utilizadores.email, perfil: utilizadores.perfil, ativo: utilizadores.ativo })
    .from(utilizadores)
    .where(eq(utilizadores.id, sessao.user.id));
  if (!u?.ativo) return { invalido: true as const };
  return { id: u.id, name: u.nome, email: u.email, perfil: u.perfil };
});

export async function exigirSessao() {
  const u = await utilizadorActual();
  if (!u) redirect("/login");
  if ("invalido" in u) redirect("/api/sessao/terminar");
  return u;
}

/** Garante que o utilizador tem um dos perfis indicados; caso contrário volta à sua página inicial. */
export async function exigirPerfil(perfis: Perfil[]) {
  const user = await exigirSessao();
  if (!perfis.includes(user.perfil)) redirect(PAGINA_INICIAL[user.perfil]);
  return user;
}
