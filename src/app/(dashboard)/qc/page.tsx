import { EmConstrucao } from "@/components/layout/em-construcao";
import { exigirPerfil } from "@/lib/sessao";

export default async function Page() {
  await exigirPerfil(["admin", "encarregado", "qc"]);
  return <EmConstrucao titulo="Controlo Qualidade" sprint={4} descricao="Fila de QC e registo de não conformidades." />;
}
