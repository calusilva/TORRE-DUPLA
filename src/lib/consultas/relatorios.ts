import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { ESTADOS_PRODUZIDOS, FUSO_FABRICA } from "@/lib/dominio";

export type Periodo = "hoje" | "semana" | "mes" | "personalizado";

export interface FiltrosRelatorio {
  periodo: Periodo;
  de: string; // YYYY-MM-DD (inclusive)
  ate: string; // YYYY-MM-DD (inclusive)
  obraId?: string;
  ofId?: string;
}

const isoDia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_FABRICA }).format(d);
const somarDias = (dia: string, n: number) => {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Converte os parâmetros da URL num intervalo de datas (no fuso da fábrica). */
export function resolverPeriodo(p: { periodo?: string; de?: string; ate?: string }): Pick<FiltrosRelatorio, "periodo" | "de" | "ate"> {
  const hoje = isoDia(new Date());
  const valida = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
  switch (p.periodo) {
    case "hoje":
      return { periodo: "hoje", de: hoje, ate: hoje };
    case "mes":
      return { periodo: "mes", de: `${hoje.slice(0, 8)}01`, ate: hoje };
    case "personalizado": {
      let de = valida(p.de) ?? somarDias(hoje, -13);
      let ate = valida(p.ate) ?? hoje;
      if (de > ate) [de, ate] = [ate, de];
      // Limite de um ano para manter as agregações rápidas.
      if (somarDias(de, 366) < ate) de = somarDias(ate, -366);
      return { periodo: "personalizado", de, ate };
    }
    default: {
      const diaSemana = (new Date(`${hoje}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = segunda
      return { periodo: "semana", de: somarDias(hoje, -diaSemana), ate: hoje };
    }
  }
}

/** Relatório de produção: KPIs, série temporal, OFs e não conformidades do período. */
export async function relatorioProducao(f: FiltrosRelatorio) {
  const inicio = sql`(${f.de}::date)::timestamp at time zone ${FUSO_FABRICA}`;
  const fim = sql`(${f.ate}::date + 1)::timestamp at time zone ${FUSO_FABRICA}`;
  const noPeriodo = (col: SQL) => sql`${col} >= ${inicio} and ${col} < ${fim}`;
  const filtroChapa = (alias: string) =>
    sql.join(
      [
        sql`true`,
        ...(f.obraId ? [sql`${sql.raw(alias)}.obra_id = ${f.obraId}`] : []),
        ...(f.ofId ? [sql`${sql.raw(alias)}.of_id = ${f.ofId}`] : []),
      ],
      sql` and `,
    );
  const produzidos = sql.join(ESTADOS_PRODUZIDOS.map((e) => sql`${e}`), sql`, `);
  const porHora = f.de === f.ate;

  const [kpis] = await db.execute<{
    produzidas: number;
    m2: number;
    tempo_medio: number | null;
    aprovacoes: number;
    reprovacoes: number;
    retrabalho: number;
    nc_abertas: number;
  }>(sql`
    select
      (select count(*)::int from chapas c where ${filtroChapa("c")} and c.estado in ('aprovada_qc','expedida','instalada') and ${noPeriodo(sql`c.data_fim_prod`)}) as produzidas,
      (select coalesce(sum(c.m2), 0)::float from chapas c where ${filtroChapa("c")} and c.estado in ('aprovada_qc','expedida','instalada') and ${noPeriodo(sql`c.data_fim_prod`)}) as m2,
      (select avg(extract(epoch from c.data_fim_prod - c.data_inicio_prod) / 60)::float from chapas c where ${filtroChapa("c")} and c.data_inicio_prod is not null and ${noPeriodo(sql`c.data_fim_prod`)}) as tempo_medio,
      (select count(*)::int from chapa_eventos e join chapas c on c.id = e.chapa_id where ${filtroChapa("c")} and e.tipo = 'qc_aprovado' and ${noPeriodo(sql`e.timestamp`)}) as aprovacoes,
      (select count(*)::int from chapa_eventos e join chapas c on c.id = e.chapa_id where ${filtroChapa("c")} and e.tipo = 'qc_reprovado' and ${noPeriodo(sql`e.timestamp`)}) as reprovacoes,
      (select count(distinct e.chapa_id)::int from chapa_eventos e join chapas c on c.id = e.chapa_id where ${filtroChapa("c")} and e.tipo = 'retrabalho_inicio' and ${noPeriodo(sql`e.timestamp`)}) as retrabalho,
      (select count(*)::int from nao_conformidades n join chapas c on c.id = n.chapa_id where ${filtroChapa("c")} and n.estado in ('aberta','em_resolucao')) as nc_abertas
  `);

  // Série: por hora (07h–20h) num único dia, por dia nos restantes períodos.
  const serie = await db.execute<{ t: string; produzidas: number; aprovadas: number }>(
    porHora
      ? sql`
        with horas as (select generate_series(7, 20) as h)
        select lpad(h::text, 2, '0') || 'h' as t,
          (select count(*)::int from chapa_eventos e join chapas c on c.id = e.chapa_id where ${filtroChapa("c")} and e.tipo in ('fim_producao','retrabalho_fim') and ${noPeriodo(sql`e.timestamp`)} and extract(hour from e.timestamp at time zone ${FUSO_FABRICA}) = h) as produzidas,
          (select count(*)::int from chapa_eventos e join chapas c on c.id = e.chapa_id where ${filtroChapa("c")} and e.tipo = 'qc_aprovado' and ${noPeriodo(sql`e.timestamp`)} and extract(hour from e.timestamp at time zone ${FUSO_FABRICA}) = h) as aprovadas
        from horas order by h`
      : sql`
        with dias as (select generate_series(${f.de}::date, ${f.ate}::date, interval '1 day')::date as d),
        ev as (
          select (e.timestamp at time zone ${FUSO_FABRICA})::date as d, e.tipo
          from chapa_eventos e join chapas c on c.id = e.chapa_id
          where ${filtroChapa("c")} and e.tipo in ('fim_producao','retrabalho_fim','qc_aprovado') and ${noPeriodo(sql`e.timestamp`)}
        )
        select to_char(dias.d, 'YYYY-MM-DD') as t,
          count(ev.*) filter (where ev.tipo in ('fim_producao','retrabalho_fim'))::int as produzidas,
          count(ev.*) filter (where ev.tipo = 'qc_aprovado')::int as aprovadas
        from dias left join ev on ev.d = dias.d
        group by dias.d order by dias.d`,
  );

  const ofs = await db.execute<{
    id: string;
    numero: string;
    obra: string;
    cliente: string;
    estado: string;
    total: number;
    produzidas: number;
    aprovadas: number;
    rejeitadas: number;
    retrabalho: number;
    produzidas_periodo: number;
  }>(sql`
    select o.id, o.numero, ob.codigo as obra, ob.cliente, o.estado,
      count(c.id)::int as total,
      count(c.id) filter (where c.estado in (${produzidos}))::int as produzidas,
      count(c.id) filter (where c.estado in ('aprovada_qc','expedida','instalada'))::int as aprovadas,
      count(c.id) filter (where c.estado = 'rejeitada_qc')::int as rejeitadas,
      count(c.id) filter (where c.estado = 'em_retrabalho')::int as retrabalho,
      count(c.id) filter (where ${noPeriodo(sql`c.data_fim_prod`)})::int as produzidas_periodo
    from ordens_fabrico o
    join obras ob on ob.id = o.obra_id
    left join chapas c on c.of_id = o.id
    where o.estado <> 'cancelada'
      ${f.obraId ? sql`and o.obra_id = ${f.obraId}` : sql``}
      ${f.ofId ? sql`and o.id = ${f.ofId}` : sql``}
    group by o.id, ob.codigo, ob.cliente
    order by o.numero desc
  `);

  const ncs = await db.execute<{ tipo: string; n: number; severidade: string }>(sql`
    select n.tipo, count(*)::int as n, mode() within group (order by n.severidade) as severidade
    from nao_conformidades n join chapas c on c.id = n.chapa_id
    where ${filtroChapa("c")} and ${noPeriodo(sql`n.data_reporte`)}
    group by n.tipo order by n desc, n.tipo
  `);

  const totalQc = kpis.aprovacoes + kpis.reprovacoes;
  return {
    porHora,
    kpis: {
      produzidas: kpis.produzidas,
      m2: kpis.m2,
      taxaQc: totalQc ? kpis.aprovacoes / totalQc : null,
      inspeccoes: totalQc,
      tempoMedio: kpis.tempo_medio,
      retrabalho: kpis.retrabalho,
      ncAbertas: kpis.nc_abertas,
    },
    serie: [...serie],
    ofs: [...ofs],
    ncs: [...ncs],
  };
}

export type DadosRelatorio = Awaited<ReturnType<typeof relatorioProducao>>;
