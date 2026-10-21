import { EmConstrucao } from "@/components/layout/em-construcao";
import { exigirPerfil } from "@/lib/sessao";

export default async function Page() {
  await exigirPerfil(["admin", "encarregado"]);
  return (
    <EmConstrucao
      titulo="Layout visual da fachada"
      sprint={3}
      descricao="Representação da fachada com cada chapa na sua posição e cor por estado de produção."
    />
  );
}
