"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Camera, History, Keyboard, Loader2, ScanBarcode, ScanLine } from "lucide-react";
import { lerChapa } from "@/app/actions/chapas";
import { AccoesChapa } from "@/components/chapas/accoes-chapa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CORES_ESTADO, LABEL_ESTADO_CHAPA, type EstadoChapa, type Perfil } from "@/lib/dominio";
import { fmtHora } from "@/lib/formato";
import type { ChapaScan } from "@/lib/queries";
import { somErro, somSucesso } from "@/lib/som";
import { cn } from "@/lib/utils";
import { CartaoChapa } from "./cartao-chapa";
import { LeitorCamara } from "./leitor-camara";
import { classificarSequencia, useLeitorTeclado, type OrigemLeitura } from "./use-leitor-teclado";

type Chapa = NonNullable<ChapaScan>;
type Modo = "camara" | "leitor" | "manual";

interface EntradaHistorico {
  id: number;
  codigo: string;
  estado: EstadoChapa;
  hora: Date;
  origem: OrigemLeitura;
  accao?: string;
}

const MODOS: { id: Modo; label: string; icon: typeof Camera }[] = [
  { id: "camara", label: "Câmara", icon: Camera },
  { id: "leitor", label: "Leitor USB", icon: ScanBarcode },
  { id: "manual", label: "Manual", icon: Keyboard },
];

export function ScanApp({ perfil }: { perfil: Perfil }) {
  const [modo, setModo] = useState<Modo>("camara");
  const [chapa, setChapa] = useState<Chapa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ tipo: "ok" | "erro"; n: number } | null>(null);
  const [historico, setHistorico] = useState<EntradaHistorico[]>([]);
  const [tempoResposta, setTempoResposta] = useState<number | null>(null);
  const [aLer, startLeitura] = useTransition();
  const ultimaLeitura = useRef<{ texto: string; t: number }>({ texto: "", t: 0 });
  const seq = useRef(0);

  // Modo preferido por dispositivo (só conveniência local).
  useEffect(() => {
    try {
      const guardado = localStorage.getItem("scan:modo") as Modo | null;
      if (guardado && MODOS.some((m) => m.id === guardado)) setModo(guardado);
      else if (!window.isSecureContext || !navigator.mediaDevices) setModo("leitor");
    } catch {
      /* armazenamento indisponível */
    }
  }, []);
  function escolherModo(m: Modo) {
    setModo(m);
    try {
      localStorage.setItem("scan:modo", m);
    } catch {
      /* ignorar */
    }
  }

  const piscar = (tipo: "ok" | "erro") => setFlash({ tipo, n: Date.now() });

  const registar = useCallback((c: Chapa, origem: OrigemLeitura, accao?: string) => {
    setHistorico((h) => [{ id: ++seq.current, codigo: c.codigo, estado: c.estado, hora: new Date(), origem, accao }, ...h].slice(0, 5));
  }, []);

  const ler = useCallback(
    (texto: string, origem: OrigemLeitura) => {
      const t = texto.trim();
      if (!t) return;
      // A câmara reporta a mesma etiqueta várias vezes por segundo.
      const agora = Date.now();
      if (t === ultimaLeitura.current.texto && agora - ultimaLeitura.current.t < 3000) return;
      ultimaLeitura.current = { texto: t, t: agora };

      startLeitura(async () => {
        const inicio = performance.now();
        const r = await lerChapa(t).catch(() => ({ ok: false as const, erro: "Sem ligação ao servidor. Verifique a rede e tente novamente." }));
        setTempoResposta(Math.round(performance.now() - inicio));
        if (r.ok) {
          window.scrollTo({ top: 0, behavior: "smooth" });
          setChapa(r.chapa);
          setErro(null);
          registar(r.chapa, origem);
          somSucesso();
          piscar("ok");
        } else {
          setErro(r.erro);
          somErro();
          piscar("erro");
        }
      });
    },
    [registar],
  );

  // Leitor em modo teclado funciona em qualquer modo, desde que o foco não esteja num campo.
  useLeitorTeclado((texto) => ler(texto, "leitor"), modo !== "leitor");

  function proxima() {
    window.scrollTo({ top: 0 });
    setChapa(null);
    setErro(null);
    ultimaLeitura.current = { texto: "", t: 0 };
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      {/* Coluna de leitura — em ecrãs pequenos recolhe enquanto há uma chapa lida */}
      <div className={cn("space-y-3", chapa && "hidden lg:block")}>
        <div className="grid grid-cols-3 gap-1 rounded-xl border bg-muted/40 p-1">
          {MODOS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => escolherModo(m.id)}
              className={cn("flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors", modo === m.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <m.icon className="size-4" />
              {m.label}
            </button>
          ))}
        </div>

        {modo === "camara" && <LeitorCamara activo={!chapa} onLeitura={(t) => ler(t, "camara")} />}
        {modo === "leitor" && <CampoLeitor onLeitura={ler} pausado={!!chapa} />}
        {modo === "manual" && <CampoManual onLeitura={(t) => ler(t, "manual")} pendente={aLer} />}

        <div className="flex h-5 items-center justify-between px-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {aLer ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> A procurar…
              </>
            ) : (
              <>
                <ScanLine className="size-3.5" /> {modo === "leitor" ? "Leitor pronto" : "Leitor USB também activo"}
              </>
            )}
          </span>
          {tempoResposta !== null && <span className="tabular-nums">resposta {tempoResposta} ms</span>}
        </div>

        {historico.length > 0 && (
          <section className="hidden rounded-xl border bg-card lg:block">
            <Historico entradas={historico} onAbrir={(c) => ler(c, "manual")} />
          </section>
        )}
      </div>

      {/* Coluna da chapa */}
      <div className="space-y-3">
        <div
          key={flash?.n}
          className={cn(
            "rounded-2xl transition-shadow",
            flash?.tipo === "ok" && "animate-[pulse_0.6s_ease-out_1] ring-4 ring-green-500/70",
            flash?.tipo === "erro" && "ring-4 ring-red-500/70",
          )}
        >
          {chapa ? (
            <CartaoChapa chapa={chapa} />
          ) : erro ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/30 dark:bg-red-500/10">
              <div className="text-lg font-semibold text-red-700 dark:text-red-300">Leitura falhada</div>
              <p className="mt-1 text-sm text-red-700/80 dark:text-red-300/80">{erro}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              <ScanLine className="size-10 opacity-50" />
              <div className="font-medium text-foreground">Nenhuma chapa lida</div>
              <p className="text-sm">Leia a etiqueta com a câmara, com o leitor USB ou introduza o código (ex.: 89-44).</p>
            </div>
          )}
        </div>

        {chapa && (
          <>
            <AccoesChapa
              key={`${chapa.id}-${chapa.estado}`}
              chapa={chapa}
              perfil={perfil}
              onActualizada={setChapa}
              onResultado={(ok, mensagem, para) => {
                if (ok) {
                  somSucesso();
                  piscar("ok");
                  if (para) setHistorico((h) => h.map((e, i) => (i === 0 && e.codigo === chapa.codigo ? { ...e, estado: para, accao: mensagem.split(": ")[1] } : e)));
                } else {
                  somErro();
                  piscar("erro");
                }
              }}
            />
            <Button variant="outline" className="h-12 w-full text-base" onClick={proxima}>
              <ScanLine /> Ler próxima chapa
            </Button>
          </>
        )}

        {historico.length > 0 && (
          <section className="rounded-xl border bg-card lg:hidden">
            <Historico entradas={historico} onAbrir={(c) => ler(c, "manual")} />
          </section>
        )}
      </div>
    </div>
  );
}

/** Campo focado para leitores em modo teclado — classifica a origem pelo ritmo das teclas. */
function CampoLeitor({ onLeitura, pausado }: { onLeitura: (texto: string, origem: OrigemLeitura) => void; pausado: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const tempos = useRef<number[]>([]);
  const [valor, setValor] = useState("");
  const [ultimaOrigem, setUltimaOrigem] = useState<OrigemLeitura | null>(null);

  // Mantém o foco no campo (excepto se o utilizador estiver noutro campo, ex.: formulário de NC).
  useEffect(() => {
    if (pausado) return;
    ref.current?.focus();
    const t = setInterval(() => {
      if (document.activeElement === document.body) ref.current?.focus();
    }, 500);
    return () => clearInterval(t);
  }, [pausado]);

  return (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed bg-muted/30 p-6 text-center">
      <ScanBarcode className="size-14 text-muted-foreground" />
      <div>
        <div className="font-semibold">Aponte o leitor à etiqueta</div>
        <p className="text-sm text-muted-foreground">QR Code ou código de barras · Enter automático</p>
      </div>
      <Input
        ref={ref}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const origem = classificarSequencia(tempos.current);
            setUltimaOrigem(origem);
            onLeitura(valor, origem);
            setValor("");
            tempos.current = [];
          } else if (e.key.length === 1) {
            const agora = performance.now();
            if (tempos.current.length && agora - tempos.current.at(-1)! > 1000) tempos.current = [];
            tempos.current.push(agora);
          }
        }}
        placeholder="À espera de leitura…"
        className="h-12 max-w-xs text-center font-mono text-lg"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
      />
      {ultimaOrigem && <span className="text-xs text-muted-foreground">Última entrada: {ultimaOrigem === "leitor" ? "leitor (< 50 ms entre caracteres)" : "teclado manual"}</span>}
    </div>
  );
}

function CampoManual({ onLeitura, pendente }: { onLeitura: (texto: string) => void; pendente: boolean }) {
  const [valor, setValor] = useState("");
  return (
    <form
      className="flex aspect-[4/3] w-full flex-col justify-center gap-3 rounded-2xl border bg-muted/30 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        onLeitura(valor);
      }}
    >
      <label htmlFor="codigo-manual" className="font-semibold">
        Código da chapa
      </label>
      <Input
        id="codigo-manual"
        value={valor}
        onChange={(e) => setValor(e.target.value.toUpperCase())}
        placeholder="TD-2610-0089-0044 ou 89-44"
        className="h-14 font-mono text-xl"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        inputMode="text"
        autoFocus
      />
      <Button type="submit" className="h-14 text-lg" disabled={pendente || !valor.trim()}>
        {pendente && <Loader2 className="animate-spin" />}
        Procurar chapa
      </Button>
      <p className="text-xs text-muted-foreground">Atalho: OF-sequência, ex.: 89-44 para a chapa 44 da OF 0089.</p>
    </form>
  );
}

function Historico({ entradas, onAbrir }: { entradas: EntradaHistorico[]; onAbrir: (codigo: string) => void }) {
  return (
    <>
      <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-medium">
        <History className="size-4 text-muted-foreground" /> Últimas leituras
      </div>
      <ul>
        {entradas.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => onAbrir(e.codigo)} className="flex w-full items-center gap-3 border-b px-4 py-2.5 text-left text-sm last:border-0 hover:bg-muted/50">
              <span className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: CORES_ESTADO[e.estado] }} />
              <span className="font-mono font-medium">{e.codigo}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{e.accao ?? LABEL_ESTADO_CHAPA[e.estado]}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{fmtHora(e.hora)}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
