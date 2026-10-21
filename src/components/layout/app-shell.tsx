"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { hrefActivo, type ItemNav } from "@/lib/navegacao";
import { SidebarNav, type ContadoresNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

export function AppShell({
  principal,
  secundaria,
  contadores,
  utilizador,
  children,
}: {
  principal: ItemNav[];
  secundaria: ItemNav[];
  contadores: ContadoresNav;
  utilizador: { nome: string; email: string; perfil: string };
  children: React.ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();
  const todos = [...principal, ...secundaria];
  const titulo = todos.find((i) => i.href === hrefActivo(pathname, todos))?.label;

  return (
    <div className="flex min-h-svh">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Logo />
        </div>
        <SidebarNav principal={principal} secundaria={secundaria} contadores={contadores} />
      </aside>

      {/* Sidebar mobile */}
      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent side="left" className="w-64 gap-0 bg-sidebar p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="flex h-14 items-center border-b px-4">
            <Logo />
          </div>
          <SidebarNav
            principal={principal}
            secundaria={secundaria}
            contadores={contadores}
            onNavigate={() => setMenuAberto(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-medium text-muted-foreground">{titulo}</h1>
          </div>
          <UserMenu {...utilizador} />
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
