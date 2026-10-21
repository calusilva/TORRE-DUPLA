import { EmConstrucao } from "@/components/layout/em-construcao";
import { exigirPerfil } from "@/lib/sessao";

export default async function Page() {
  await exigirPerfil(["admin", "encarregado", "operador", "qc"]);
  return <EmConstrucao titulo="Scan QR" sprint={3} descricao="Leitura de QR Code por câmara ou leitor USB e mudança de estado da chapa." />;
}
