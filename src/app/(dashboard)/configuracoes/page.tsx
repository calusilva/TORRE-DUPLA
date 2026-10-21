import { EmConstrucao } from "@/components/layout/em-construcao";
import { exigirPerfil } from "@/lib/sessao";

export default async function Page() {
  await exigirPerfil(["admin"]);
  return <EmConstrucao titulo="Configurações" sprint={4} descricao="Utilizadores, perfis e parâmetros da fábrica." />;
}
