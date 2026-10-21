import { EsqueletoCabecalho, EsqueletoStats, EsqueletoTabela } from "@/components/comum/esqueletos";

export default function A_Carregar() {
  return (
    <>
      <EsqueletoCabecalho />
      <EsqueletoStats />
      <div className="mt-6">
        <EsqueletoTabela linhas={5} colunas={6} />
      </div>
    </>
  );
}
