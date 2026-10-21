"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SERIES = [
  { chave: "produzidas", nome: "Chapas produzidas", cor: "var(--serie-1)" },
  { chave: "aprovadas", nome: "Aprovadas QC", cor: "var(--serie-2)" },
] as const;

const DF_DIA = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" });
const rotulo = (t: string) => (/^\d{4}-\d{2}-\d{2}$/.test(t) ? DF_DIA.format(new Date(`${t}T12:00:00`)).replace(".", "") : t);

/** Produção vs aprovações QC ao longo do período (uma única escala: chapas). */
export function GraficoProducao({ serie }: { serie: { t: string; produzidas: number; aprovadas: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={serie} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="t" tickFormatter={rotulo} tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} minTickGap={16} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} width={40} />
        <Tooltip
          labelFormatter={(t) => rotulo(String(t))}
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)", fontSize: 13 }}
          cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
        />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 13, color: "var(--foreground)" }} />
        {SERIES.map((s) => (
          <Line
            key={s.chave}
            type="linear"
            dataKey={s.chave}
            name={s.nome}
            stroke={s.cor}
            strokeWidth={2}
            strokeLinecap="round"
            dot={serie.length <= 31 ? { r: 4, fill: s.cor, stroke: "var(--card)", strokeWidth: 2 } : false}
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
