import { redirect } from "next/navigation";
import { PAGINA_INICIAL } from "@/lib/navegacao";
import { exigirSessao } from "@/lib/sessao";

export default async function Home() {
  const user = await exigirSessao();
  redirect(PAGINA_INICIAL[user.perfil]);
}
