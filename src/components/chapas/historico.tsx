import {
  CheckCircle2,
  Circle,
  Eye,
  MapPin,
  MessageSquare,
  Play,
  ScanLine,
  ShieldCheck,
  Truck,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { LABEL_EVENTO, type TipoEvento } from "@/lib/dominio";
import { fmtDataHora, fmtDuracao } from "@/lib/formato";
import { cn } from "@/lib/utils";

const ICONE: Record<TipoEvento, { icon: LucideIcon; cor: string }> = {
  criacao: { icon: Circle, cor: "text-muted-foreground bg-muted" },
  inicio_producao: { icon: Play, cor: "text-amber-700 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300" },
  fim_producao: { icon: CheckCircle2, cor: "text-green-700 bg-green-100 dark:bg-green-500/15 dark:text-green-300" },
  qc_aprovado: { icon: ShieldCheck, cor: "text-green-700 bg-green-100 dark:bg-green-500/15 dark:text-green-300" },
  qc_reprovado: { icon: XCircle, cor: "text-red-700 bg-red-100 dark:bg-red-500/15 dark:text-red-300" },
  retrabalho_inicio: { icon: Wrench, cor: "text-orange-700 bg-orange-100 dark:bg-orange-500/15 dark:text-orange-300" },
  retrabalho_fim: { icon: Wrench, cor: "text-green-700 bg-green-100 dark:bg-green-500/15 dark:text-green-300" },
  expedicao: { icon: Truck, cor: "text-blue-700 bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300" },
  instalacao: { icon: MapPin, cor: "text-violet-700 bg-violet-100 dark:bg-violet-500/15 dark:text-violet-300" },
  observacao: { icon: MessageSquare, cor: "text-muted-foreground bg-muted" },
  scan_qr: { icon: ScanLine, cor: "text-muted-foreground bg-muted" },
};

export interface EventoHistorico {
  id: string;
  tipo: string;
  descricao: string | null;
  timestamp: Date | null;
  metadados: unknown;
  utilizador: { nome: string; perfil: string } | null;
}

/** Linha temporal de eventos (mais recente primeiro). */
export function Historico({ eventos }: { eventos: EventoHistorico[] }) {
  return (
    <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-border">
      {eventos.map((e) => {
        const cfg = ICONE[e.tipo as TipoEvento] ?? { icon: Eye, cor: "bg-muted" };
        const Icone = cfg.icon;
        const meta = (e.metadados ?? {}) as { posto?: string; duracaoMin?: number; guia?: string; viatura?: string };
        return (
          <li key={e.id} className="relative flex gap-3">
            <span className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card", cfg.cor)}>
              <Icone className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-medium">{LABEL_EVENTO[e.tipo as TipoEvento] ?? e.tipo}</span>
                <time className="text-xs tabular-nums text-muted-foreground">{fmtDataHora(e.timestamp)}</time>
              </div>
              <div className="mt-0.5 space-y-0.5 text-sm text-muted-foreground">
                {e.descricao && <p>{e.descricao}</p>}
                <p className="flex flex-wrap gap-x-3">
                  {e.utilizador && <span>{e.utilizador.perfil === "qc" ? "Inspector" : "Por"}: {e.utilizador.nome}</span>}
                  {meta.posto && <span>Posto: {meta.posto}</span>}
                  {meta.duracaoMin != null && <span>Duração: {fmtDuracao(meta.duracaoMin)}</span>}
                  {meta.guia && <span>Guia: {meta.guia}</span>}
                  {meta.viatura && <span>Viatura: {meta.viatura}</span>}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
