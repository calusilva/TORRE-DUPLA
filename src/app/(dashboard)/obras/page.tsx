import { EmConstrucao } from "@/components/layout/em-construcao";
import { exigirPerfil } from "@/lib/sessao";

export default async function Page() {
  await exigirPerfil(["admin", "encarregado"]);
  return <EmConstrucao titulo="Obras" sprint={2} descricao="Lista de obras com área total, tipo de fachada, prazos e progresso de produção." />;
}
