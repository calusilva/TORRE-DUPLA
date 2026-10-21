import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sessão" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      {/* Painel de marca */}
      <section className="relative hidden overflow-hidden bg-neutral-950 text-neutral-100 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <FachadaDecorativa />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/85 to-neutral-950/10" />
        <div className="relative flex items-center gap-3">
          <LogoMark invertido className="size-10" />
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">GS ERP Industrial</div>
            <div className="text-sm text-neutral-400">Torre Dupla, Lda.</div>
          </div>
        </div>
        <div className="relative max-w-md space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Cada chapa, do corte à fachada.
          </h1>
          <p className="text-neutral-400 text-pretty">
            Ordens de fabrico, produção em tempo real e rastreabilidade individual por QR Code — num só sistema.
          </p>
        </div>
        <p className="relative text-xs text-neutral-500">Ambiente de demonstração · GS Improve</p>
      </section>

      {/* Formulário */}
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <LogoMark className="size-10" />
            <div className="leading-tight">
              <div className="font-semibold tracking-tight">GS ERP Industrial</div>
              <div className="text-sm text-muted-foreground">Torre Dupla, Lda.</div>
            </div>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Iniciar sessão</h2>
            <p className="text-sm text-muted-foreground">Introduza as suas credenciais para continuar.</p>
          </div>
          <LoginForm redirectTo={callbackUrl} />
        </div>
      </section>
    </main>
  );
}

/** Grelha de chapas em fundo, com algumas "em produção" e "produzidas". */
function FachadaDecorativa() {
  const cols = 9;
  const rows = 12;
  const destaque: Record<number, string> = {
    14: "#fbbf24", 15: "#22c55e", 16: "#22c55e", 23: "#22c55e", 24: "#22c55e", 25: "#86efac",
    31: "#22c55e", 32: "#22c55e", 33: "#22c55e", 34: "#fbbf24", 40: "#22c55e", 41: "#22c55e",
    42: "#22c55e", 43: "#22c55e", 49: "#60a5fa", 50: "#60a5fa", 51: "#22c55e", 52: "#22c55e",
  };
  return (
    <svg
      aria-hidden
      className="absolute -right-10 top-1/2 h-[115%] -translate-y-1/2 opacity-50"
      viewBox={`0 0 ${cols * 42} ${rows * 26}`}
    >
      {Array.from({ length: cols * rows }, (_, i) => {
        const x = (i % cols) * 42;
        const y = Math.floor(i / cols) * 26;
        const largura = i % 4 === 2 ? 28 : 40;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={largura}
            height={24}
            rx={1.5}
            fill={destaque[i] ?? "#262626"}
            fillOpacity={destaque[i] ? 0.85 : 1}
          />
        );
      })}
    </svg>
  );
}
