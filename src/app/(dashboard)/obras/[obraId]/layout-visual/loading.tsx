import { EsqueletoCabecalho, EsqueletoFachada } from "@/components/comum/esqueletos";
import { Skeleton } from "@/components/ui/skeleton";

export default function A_Carregar() {
  return (
    <>
      <EsqueletoCabecalho />
      <div className="mb-4 grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="mb-4 h-9 w-full max-w-2xl" />
      <EsqueletoFachada />
    </>
  );
}
