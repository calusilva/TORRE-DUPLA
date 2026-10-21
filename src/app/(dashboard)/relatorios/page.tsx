import { EmConstrucao } from "@/components/layout/em-construcao";
import { exigirPerfil } from "@/lib/sessao";

export default async function Page() {
  await exigirPerfil(["admin", "encarregado"]);
  return <EmConstrucao titulo="Relatórios" sprint={4} descricao="Produção por OF e por período, com gráfico diário." />;
}
