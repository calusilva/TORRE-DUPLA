import { EmConstrucao } from "@/components/layout/em-construcao";
import { exigirPerfil } from "@/lib/sessao";

export default async function Page() {
  await exigirPerfil(["admin", "encarregado", "operador", "qc"]);
  return <EmConstrucao titulo="Ordens de Fabrico" sprint={2} descricao="OFs por obra, geração de chapas em lote com códigos automáticos e impressão de etiquetas QR." />;
}
