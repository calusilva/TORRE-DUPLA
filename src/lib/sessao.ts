import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Perfil } from "@/lib/dominio";
import { PAGINA_INICIAL } from "@/lib/navegacao";

/** Devolve o utilizador autenticado ou redirecciona para o login. */
export async function exigirSessao() {
  const sessao = await auth();
  if (!sessao?.user) redirect("/login");
  return sessao.user;
}

/** Garante que o utilizador tem um dos perfis indicados; caso contrário volta à sua página inicial. */
export async function exigirPerfil(perfis: Perfil[]) {
  const user = await exigirSessao();
  if (!perfis.includes(user.perfil)) redirect(PAGINA_INICIAL[user.perfil]);
  return user;
}
