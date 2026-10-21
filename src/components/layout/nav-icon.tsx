import {
  BarChart3,
  ClipboardList,
  Factory,
  Package,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { ItemNav } from "@/lib/navegacao";

const ICONES: Record<ItemNav["icon"], LucideIcon> = {
  obras: ClipboardList,
  of: Package,
  producao: Factory,
  scan: ScanLine,
  rastreabilidade: Search,
  qc: ShieldCheck,
  relatorios: BarChart3,
  configuracoes: Settings,
};

export function NavIcon({ icon, className }: { icon: ItemNav["icon"]; className?: string }) {
  const Icone = ICONES[icon];
  return <Icone className={className} />;
}
