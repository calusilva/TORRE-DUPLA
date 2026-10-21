"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CORES_ESTADO, ESTADOS_CHAPA, LABEL_ESTADO_CHAPA, type EstadoChapa } from "@/lib/dominio";

/**
 * Chapas por estado — barras horizontais (os nomes dos estados são longos).
 * A identidade não depende só da cor: cada barra tem o nome no eixo e o valor na ponta.
 */
export function GraficoEstados({ porEstado }: { porEstado: Record<EstadoChapa, number> }) {
  const dados = ESTADOS_CHAPA.map((e) => ({ estado: e, label: LABEL_ESTADO_CHAPA[e], n: porEstado[e] ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }} barCategoryGap={6}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={118} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 14 }} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)" }}
          formatter={(v) => [`${v} chapas`, ""]}
          separator=""
        />
        <Bar dataKey="n" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false}>
          {dados.map((d) => (
            <Cell key={d.estado} fill={CORES_ESTADO[d.estado]} />
          ))}
          <LabelList dataKey="n" position="right" style={{ fill: "var(--foreground)", fontSize: 15, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
