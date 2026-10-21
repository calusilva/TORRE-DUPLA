import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { auth } from "@/auth";
import { LogoMark } from "@/components/brand/logo";
import { Historico } from "@/components/chapas/historico";
import { MiniMapa } from "@/components/chapas/mini-mapa";
import { CORES_ESTADO, LABEL_ESTADO_CHAPA } from "@/lib/dominio";
import { fmtDimensoes, fmtM2 } from "@/lib/formato";
import { chapasDaZona, obterChapaPorCodigo } from "@/lib/queries";

type Params = { params: Promise<{ codigo: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { codigo } = await params;
  return { title: `Rastreabilidade ${decodeURIComponent(codigo).toUpperCase()}`, robots: { index: false } };
}

/** Página pública aberta pelo QR Code da etiqueta — histórico completo da chapa. */
export default async function RastreabilidadePage({ params }: Params) {
  const { codigo } = await params;
  const chapa = await obterChapaPorCodigo(decodeURIComponent(codigo).toUpperCase().trim());
  if (!chapa) notFound();
  const [sessao, vizinhas] = await Promise.all([auth(), chapasDaZona(chapa.obraId, chapa.zona)]);
  const cor = CORES_ESTADO[chapa.estado];
  const gps = chapa.eventos.find((e) => e.tipo === "instalacao" && e.latitude && e.longitude);

  return (
    <main className="min-h-svh bg-muted/40">
      <div className="mx-auto max-w-xl space-y-4 px-4 py-6 sm:py-10">
        <header className="flex items-center gap-3">
          <LogoMark className="size-9" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">
              GS ERP Industrial <span className="text-muted-foreground">| Torre Dupla</span>
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Rastreabilidade de chapa</div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="space-y-1 p-5">
            <h1 className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">{chapa.codigo}</h1>
            <p className="text-sm">
              <span className="font-mono">{chapa.of.numero}</span> | {chapa.obra.cliente}
            </p>
            <p className="text-sm text-muted-foreground">{chapa.obra.nome}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t p-5 text-sm">
            <Dado k="Zona" v={chapa.zona} />
            <Dado k="Posição" v={`Piso ${chapa.piso} · Coluna ${chapa.coluna}`} />
            <Dado k="Material" v={chapa.material} />
            <Dado k="Dimensões" v={`${fmtDimensoes(chapa.largura, chapa.altura)} · ${fmtM2(chapa.m2)}`} />
          </dl>
          <div className="flex items-center gap-3 border-t px-5 py-4" style={{ backgroundColor: `${cor}33`, borderTopColor: cor }}>
            <span className="size-4 rounded-full ring-2 ring-black/10" style={{ backgroundColor: cor }} />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Estado actual</span>
            <span className="ml-auto text-lg font-bold uppercase">{LABEL_ESTADO_CHAPA[chapa.estado]}</span>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium">Localização na fachada — {chapa.zona}</h2>
          <MiniMapa chapas={vizinhas} actualId={chapa.id} />
          {gps && (
            <a
              href={`https://www.google.com/maps?q=${gps.latitude},${gps.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <MapPin className="size-4" /> Instalação registada em obra (GPS)
            </a>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-5 font-medium">Histórico</h2>
          <Historico eventos={chapa.eventos} />
        </section>

        {sessao?.user && (
          <Link href={`/of/${chapa.ofId}/chapas/${chapa.id}`} className="flex items-center justify-center gap-2 rounded-xl border bg-card p-3 text-sm font-medium hover:bg-muted">
            Abrir ficha no ERP <ArrowRight className="size-4" />
          </Link>
        )}
        <p className="text-center text-xs text-muted-foreground">Torre Dupla, Lda. · Fachadas e painéis compósitos</p>
      </div>
    </main>
  );
}

function Dado({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v || "—"}</dd>
    </div>
  );
}
