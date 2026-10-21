"use client";

import { useMemo, useState } from "react";
import { Campo } from "@/components/comum/campo";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dimensoesGrelha, interpretarPadrao, planearGrelha } from "@/lib/fachada";
import { fmtInt, fmtKg, fmtM2 } from "@/lib/formato";
import { LISTA_MATERIAIS, materialPorId } from "@/lib/materiais";
import { MAX_CHAPAS_LOTE } from "@/lib/validacao";
import { cn } from "@/lib/utils";

const PRESETS = [
  { nome: "Uniforme 1200×600", larguras: "1200x10", alturas: "600x6" },
  { nome: "Misto 1200/900/600", larguras: "1200x2, 900, 600, 1200x2, 600, 900, 1200x2", alturas: "600x6" },
  { nome: "Cassete 1500×1000", larguras: "1500x8", alturas: "1000x4" },
  { nome: "Banda horizontal", larguras: "3000x6", alturas: "450x3" },
];

/**
 * Campos de geração de um lote de chapas a partir da grelha da fachada,
 * com pré-visualização das posições que vão ser gravadas.
 */
export function GeradorChapas({
  erros = {},
  zonaInicial = "",
  materialInicial = "acmPrata",
  zonasExistentes = [],
  pisoInicial = 1,
}: {
  erros?: Record<string, string>;
  zonaInicial?: string;
  materialInicial?: string;
  zonasExistentes?: string[];
  pisoInicial?: number;
}) {
  const [zona, setZona] = useState(zonaInicial);
  const [materialId, setMaterialId] = useState(materialInicial);
  const [larguras, setLarguras] = useState(PRESETS[1].larguras);
  const [alturas, setAlturas] = useState(PRESETS[1].alturas);
  const [pisoBase, setPisoBase] = useState(String(pisoInicial));

  const ls = interpretarPadrao(larguras);
  const as = interpretarPadrao(alturas);
  const material = materialPorId(materialId);

  const resumo = useMemo(() => {
    if (!ls || !as) return null;
    const n = ls.length * as.length;
    const m2 = (ls.reduce((a, b) => a + b, 0) * as.reduce((a, b) => a + b, 0)) / 1e6;
    return {
      n,
      m2,
      peso: material ? m2 * material.kgM2 : 0,
      larguraM: ls.reduce((a, b) => a + b, 0) / 1000,
      alturaM: as.reduce((a, b) => a + b, 0) / 1000,
    };
  }, [ls, as, material]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="loteZona" label="Zona" obrigatorio erro={erros.loteZona} ajuda={zonasExistentes.length ? `Existentes: ${zonasExistentes.join(", ")} — repetir uma zona coloca o lote à direita` : undefined}>
          <Input id="loteZona" name="loteZona" value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Fachada Norte" list="zonas-sugeridas" aria-invalid={!!erros.loteZona} />
          <datalist id="zonas-sugeridas">
            {[...new Set([...zonasExistentes, "Fachada Norte", "Fachada Sul", "Fachada Este", "Fachada Oeste", "Cobertura", "Átrio", "Platibanda"])].map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </Campo>
        <Campo id="materialId" label="Material" obrigatorio erro={erros.materialId}>
          <Select name="materialId" value={materialId} onValueChange={setMaterialId}>
            <SelectTrigger id="materialId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LISTA_MATERIAIS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome}
                  <span className="text-muted-foreground"> · {m.kgM2} kg/m²</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="py-1 text-xs text-muted-foreground">Modelos:</span>
        {PRESETS.map((p) => (
          <button
            key={p.nome}
            type="button"
            onClick={() => {
              setLarguras(p.larguras);
              setAlturas(p.alturas);
            }}
            className={cn(
              "rounded-md border px-2 py-1 text-xs hover:bg-muted",
              larguras === p.larguras && alturas === p.alturas && "border-primary bg-muted",
            )}
          >
            {p.nome}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_7rem]">
        <Campo id="larguras" label="Larguras das colunas (mm)" obrigatorio erro={erros.larguras ?? (!ls ? "Padrão inválido" : undefined)} ajuda="Esquerda → direita. Ex.: 1200x4, 900, 600">
          <Input id="larguras" name="larguras" value={larguras} onChange={(e) => setLarguras(e.target.value)} className="font-mono" aria-invalid={!ls || !!erros.larguras} />
        </Campo>
        <Campo id="alturas" label="Alturas das filas (mm)" obrigatorio erro={erros.alturas ?? (!as ? "Padrão inválido" : undefined)} ajuda="Topo → base. Ex.: 600x6">
          <Input id="alturas" name="alturas" value={alturas} onChange={(e) => setAlturas(e.target.value)} className="font-mono" aria-invalid={!as || !!erros.alturas} />
        </Campo>
        <Campo id="pisoBase" label="Piso da base" erro={erros.pisoBase}>
          <Input id="pisoBase" name="pisoBase" type="number" min={-5} max={100} value={pisoBase} onChange={(e) => setPisoBase(e.target.value)} />
        </Campo>
      </div>

      {ls && as && resumo && (
        <div className="overflow-hidden rounded-xl border">
          <div className="flex flex-wrap gap-x-6 gap-y-1 border-b bg-muted/40 px-4 py-2.5 text-sm">
            <span>
              <strong className="tabular-nums">{fmtInt(resumo.n)}</strong> chapas
            </span>
            <span className="tabular-nums">{ls.length} colunas × {as.length} filas</span>
            <span className="tabular-nums">{fmtM2(resumo.m2)}</span>
            <span className="tabular-nums">≈ {fmtKg(resumo.peso)}</span>
            <span className="tabular-nums text-muted-foreground">
              Fachada {resumo.larguraM.toLocaleString("pt-PT")} × {resumo.alturaM.toLocaleString("pt-PT")} m
            </span>
            {resumo.n > MAX_CHAPAS_LOTE && <span className="text-destructive">Máximo {MAX_CHAPAS_LOTE} chapas por lote</span>}
          </div>
          <PreVisualizacao larguras={ls} alturas={as} pisoBase={Number(pisoBase) || 0} />
        </div>
      )}
    </div>
  );
}

function PreVisualizacao({ larguras, alturas, pisoBase }: { larguras: number[]; alturas: number[]; pisoBase: number }) {
  const n = larguras.length * alturas.length;
  if (n > MAX_CHAPAS_LOTE) return null;

  const chapas = planearGrelha({ zona: "", larguras, alturas, pisoBase });
  const dim = dimensoesGrelha({ larguras, alturas });
  const margemEsq = 34;
  const margemTopo = 16;
  const mostrarTexto = larguras.length <= 30 && alturas.length <= 20;

  return (
    <div className="max-h-80 overflow-auto bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,var(--color-muted)_6px,var(--color-muted)_7px)] p-4">
      <svg
        viewBox={`${-margemEsq} ${-margemTopo} ${dim.largura + margemEsq + 2} ${dim.altura + margemTopo + 2}`}
        className="mx-auto block h-auto max-h-64 w-full"
        style={{ maxWidth: (dim.largura + margemEsq) * 1.6 }}
        role="img"
        aria-label={`Pré-visualização: ${n} chapas`}
      >
        {chapas.map((c) => (
          <g key={c.seq}>
            <rect
              x={c.posicaoX}
              y={c.posicaoY}
              width={c.largura * 0.1}
              height={c.altura * 0.1}
              rx={1}
              className="fill-neutral-200 stroke-neutral-400 dark:fill-neutral-700 dark:stroke-neutral-500"
              strokeWidth={0.5}
            />
            {mostrarTexto && c.largura * 0.1 > 24 && (
              <text
                x={c.posicaoX + (c.largura * 0.1) / 2}
                y={c.posicaoY + (c.altura * 0.1) / 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-neutral-500 font-mono"
                fontSize={Math.min(9, c.altura * 0.1 * 0.3)}
              >
                {String(c.seq).padStart(4, "0")}
              </text>
            )}
          </g>
        ))}
        {/* Colunas */}
        {mostrarTexto &&
          chapas
            .filter((c) => c.linha === 1)
            .map((c) => (
              <text key={`c${c.coluna}`} x={c.posicaoX + (c.largura * 0.1) / 2} y={-5} textAnchor="middle" fontSize={8} className="fill-muted-foreground font-medium">
                {c.coluna}
              </text>
            ))}
        {/* Pisos */}
        {mostrarTexto &&
          chapas
            .filter((c) => c.coluna === "A")
            .map((c) => (
              <text key={`p${c.linha}`} x={-6} y={c.posicaoY + (c.altura * 0.1) / 2} textAnchor="end" dominantBaseline="central" fontSize={8} className="fill-muted-foreground">
                P{c.piso}
              </text>
            ))}
      </svg>
    </div>
  );
}
