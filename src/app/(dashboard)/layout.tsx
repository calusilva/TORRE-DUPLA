import { count, eq } from "drizzle-orm";
import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/db";
import { chapas } from "@/db/schema";
import { LABEL_PERFIL } from "@/lib/dominio";
import { itensParaPerfil, NAV_PRINCIPAL, NAV_SECUNDARIA } from "@/lib/navegacao";
import { exigirSessao } from "@/lib/sessao";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await exigirSessao();

  const [{ emProducao }] = await db
    .select({ emProducao: count() })
    .from(chapas)
    .where(eq(chapas.estado, "em_producao"));

  return (
    <AppShell
      principal={itensParaPerfil(NAV_PRINCIPAL, user.perfil)}
      secundaria={itensParaPerfil(NAV_SECUNDARIA, user.perfil)}
      contadores={{ producao: emProducao }}
      utilizador={{ nome: user.name ?? "", email: user.email ?? "", perfil: LABEL_PERFIL[user.perfil] }}
    >
      {children}
    </AppShell>
  );
}
