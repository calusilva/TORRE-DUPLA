"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hrefActivo, type ItemNav } from "@/lib/navegacao";
import { NavIcon } from "./nav-icon";

export interface ContadoresNav {
  producao: number;
  qc: number;
  stock: number;
}

const ESTILO_BADGE: Record<keyof ContadoresNav, { classe: string; ponto?: string; titulo: (n: number) => string }> = {
  producao: { classe: "bg-amber-400/20 text-amber-700 dark:text-amber-300", ponto: "animate-pulse bg-amber-500", titulo: (n) => `${n} chapas em produção` },
  qc: { classe: "bg-green-500/15 text-green-800 dark:text-green-300", ponto: "animate-pulse bg-green-500", titulo: (n) => `${n} chapas aguardam inspecção` },
  stock: { classe: "bg-red-600 text-white", titulo: (n) => `${n} referência(s) abaixo do mínimo` },
};

export function SidebarNav({
  principal,
  secundaria,
  contadores,
  onNavigate,
}: {
  principal: ItemNav[];
  secundaria: ItemNav[];
  contadores: ContadoresNav;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const activo = hrefActivo(pathname, [...principal, ...secundaria]);

  const renderItem = (item: ItemNav) => {
    const isActivo = item.href === activo;
    const badge = item.badge ? contadores[item.badge] : 0;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={isActivo ? "page" : undefined}
          className={cn(
            "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/70 transition-colors",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isActivo && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <NavIcon icon={item.icon} className="size-4 shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && badge > 0 && (
            <span
              className={cn("flex h-5 min-w-5 items-center justify-center gap-1 rounded-full px-1.5 text-[11px] font-semibold tabular-nums", ESTILO_BADGE[item.badge].classe)}
              title={ESTILO_BADGE[item.badge].titulo(badge)}
            >
              {ESTILO_BADGE[item.badge].ponto && <span className={cn("size-1.5 rounded-full", ESTILO_BADGE[item.badge].ponto)} />}
              {badge}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
      <ul className="space-y-0.5">{principal.map(renderItem)}</ul>
      {secundaria.length > 0 && (
        <>
          <div className="mt-auto h-px bg-sidebar-border" />
          <ul className="space-y-0.5">{secundaria.map(renderItem)}</ul>
        </>
      )}
    </nav>
  );
}
