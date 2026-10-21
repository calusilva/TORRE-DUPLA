import { AppShell } from "@/components/layout/app-shell";
import { obterContadores } from "@/lib/consultas/contadores";
import { LABEL_PERFIL } from "@/lib/dominio";
import { itensParaPerfil, NAV_PRINCIPAL, NAV_SECUNDARIA } from "@/lib/navegacao";
import { exigirSessao } from "@/lib/sessao";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await exigirSessao();

  const contadores = await obterContadores();

  return (
    <AppShell
      principal={itensParaPerfil(NAV_PRINCIPAL, user.perfil)}
      secundaria={itensParaPerfil(NAV_SECUNDARIA, user.perfil)}
      contadores={contadores}
      utilizador={{ nome: user.name ?? "", email: user.email ?? "", perfil: LABEL_PERFIL[user.perfil] }}
    >
      {children}
    </AppShell>
  );
}
