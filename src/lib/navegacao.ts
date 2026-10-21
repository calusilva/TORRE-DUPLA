import type { Perfil } from "@/lib/dominio";

export interface ItemNav {
  href: string;
  label: string;
  icon: "obras" | "of" | "producao" | "scan" | "rastreabilidade" | "qc" | "relatorios" | "configuracoes";
  perfis: Perfil[];
  badge?: "producao";
}

const TODOS: Perfil[] = ["admin", "encarregado", "operador", "qc"];
const GESTAO: Perfil[] = ["admin", "encarregado"];

export const NAV_PRINCIPAL: ItemNav[] = [
  { href: "/obras", label: "Obras", icon: "obras", perfis: GESTAO },
  { href: "/of", label: "Ordens de Fabrico", icon: "of", perfis: TODOS },
  { href: "/producao", label: "Produção", icon: "producao", perfis: TODOS, badge: "producao" },
  { href: "/producao/scan", label: "Scan QR", icon: "scan", perfis: TODOS },
  { href: "/rastreabilidade", label: "Rastreabilidade", icon: "rastreabilidade", perfis: TODOS },
  { href: "/qc", label: "Controlo Qualidade", icon: "qc", perfis: ["admin", "encarregado", "qc"] },
  { href: "/relatorios", label: "Relatórios", icon: "relatorios", perfis: GESTAO },
];

export const NAV_SECUNDARIA: ItemNav[] = [
  { href: "/configuracoes", label: "Configurações", icon: "configuracoes", perfis: ["admin"] },
];

/** Página inicial de cada perfil após login. */
export const PAGINA_INICIAL: Record<Perfil, string> = {
  admin: "/obras",
  encarregado: "/obras",
  operador: "/producao/scan",
  qc: "/qc",
};

export function itensParaPerfil(itens: ItemNav[], perfil: Perfil) {
  return itens.filter((i) => i.perfis.includes(perfil));
}

/** Item activo = o de prefixo mais longo que corresponde ao pathname. */
export function hrefActivo(pathname: string, itens: ItemNav[]) {
  return itens
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}
