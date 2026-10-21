import { EmConstrucao } from "@/components/layout/em-construcao";
import { exigirPerfil } from "@/lib/sessao";

export default async function Page() {
  await exigirPerfil(["admin", "encarregado", "operador", "qc"]);
  return <EmConstrucao titulo="Produção em tempo real" sprint={3} descricao="Dashboard do chão de fábrica para ecrã grande, com actualização em tempo real." />;
}
