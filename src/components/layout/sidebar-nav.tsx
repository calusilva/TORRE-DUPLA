"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hrefActivo, type ItemNav } from "@/lib/navegacao";
import { NavIcon } from "./nav-icon";

export interface ContadoresNav {
  producao: number;
}

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
          {badge > 0 && (
            <span
              className="flex h-5 min-w-5 items-center justify-center gap-1 rounded-full bg-amber-400/20 px-1.5 text-[11px] font-semibold tabular-nums text-amber-700 dark:text-amber-300"
              title={`${badge} chapas em produção`}
            >
              <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
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
