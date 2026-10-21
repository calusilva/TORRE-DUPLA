import { EmConstrucao } from "@/components/layout/em-construcao";
import { exigirPerfil } from "@/lib/sessao";

export default async function Page() {
  await exigirPerfil(["admin", "encarregado", "operador", "qc"]);
  return <EmConstrucao titulo="Rastreabilidade" sprint={4} descricao="Histórico completo de cada chapa, do corte à instalação em obra." />;
}
