import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";

export default function ChapaNaoEncontrada() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <LogoMark className="size-10" />
      <h1 className="text-xl font-semibold">Chapa não encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">O código lido não corresponde a nenhuma chapa registada. Verifique a etiqueta ou contacte a Torre Dupla.</p>
      <Link href="/rastreabilidade" className="text-sm underline underline-offset-4">
        Pesquisar outro código
      </Link>
    </main>
  );
}
