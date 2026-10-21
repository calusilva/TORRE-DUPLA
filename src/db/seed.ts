/**
 * Seed da demo GS ERP Industrial — Torre Dupla.
 *
 * Todas as datas são relativas ao momento em que o seed corre, para que o
 * dashboard mostre sempre "produção de hoje" e chapas em produção "há X min".
 * Correr `npm run db:seed` na manhã da apresentação.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { calcularM2, gerarCodigoChapa, gerarPayloadQR, sufixoOf } from "../lib/codigos";
import { POSTOS_TRABALHO, type EstadoChapa } from "../lib/dominio";
import { planearGrelha, type ChapaPlaneada, type GrelhaZona } from "../lib/fachada";
import { MATERIAIS } from "../lib/materiais";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

// ------------------------------------------------------------
// Aleatoriedade determinística (o seed produz sempre a mesma história)
// ------------------------------------------------------------
let semente = 20241016;
function rand() {
  semente = (semente * 1664525 + 1013904223) % 4294967296;
  return semente / 4294967296;
}
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const escolher = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

// ------------------------------------------------------------
// Tempo útil de fábrica: seg–sex, 07:00–19:00
// ------------------------------------------------------------
const INICIO_TURNO = 7;
const FIM_TURNO = 19;
const MIN = 60_000;

function eDiaUtil(d: Date) {
  const dia = d.getDay();
  return dia !== 0 && dia !== 6;
}

/** Recua `minutos` de tempo útil a partir de `data`. */
function recuarTempoUtil(data: Date, minutos: number): Date {
  let cursor = new Date(data);
  let restante = minutos;
  while (restante > 0) {
    const inicioTurno = new Date(cursor);
    inicioTurno.setHours(INICIO_TURNO, 0, 0, 0);
    const fimTurno = new Date(cursor);
    fimTurno.setHours(FIM_TURNO, 0, 0, 0);

    if (!eDiaUtil(cursor) || cursor <= inicioTurno) {
      // salta para o fim do turno do dia útil anterior
      cursor.setDate(cursor.getDate() - 1);
      cursor.setHours(FIM_TURNO, 0, 0, 0);
      continue;
    }
    if (cursor > fimTurno) cursor = fimTurno;

    const disponivel = (cursor.getTime() - inicioTurno.getTime()) / MIN;
    const usar = Math.min(disponivel, restante);
    cursor = new Date(cursor.getTime() - usar * MIN);
    restante -= usar;
  }
  return cursor;
}

const agora = new Date();
const ANO = agora.getFullYear();
const minAtras = (m: number) => new Date(agora.getTime() - m * MIN);
const diasAtras = (d: number, hora = 10) => {
  const r = new Date(agora);
  r.setDate(r.getDate() - d);
  r.setHours(hora, randInt(0, 59), 0, 0);
  return r;
};
const dataISO = (d: Date) => d.toISOString().slice(0, 10);
const diasAFrente = (d: number) => {
  const r = new Date(agora);
  r.setDate(r.getDate() + d);
  return dataISO(r);
};

type Material = (typeof MATERIAIS)[keyof typeof MATERIAIS];

/** Planeia várias zonas de uma OF com sequência contínua. */
function planearChapas(zonas: GrelhaZona[]): ChapaPlaneada[] {
  const out: ChapaPlaneada[] = [];
  for (const z of zonas) out.push(...planearGrelha(z, { seqInicial: out.length + 1 }));
  return out;
}

async function main() {
  console.log("→ A limpar base de dados…");
  await db.execute(sql`
    TRUNCATE etiquetas_impressas, nao_conformidades, chapa_eventos, chapas,
             ordens_fabrico, obras, utilizadores RESTART IDENTITY CASCADE
  `);

  // ----------------------------------------------------------
  // Utilizadores
  // ----------------------------------------------------------
  console.log("→ Utilizadores");
  // IDs fixos: repetir o seed não invalida as sessões abertas.
  const idUtilizador = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const hash = await bcrypt.hash("demo123", 10);
  const users = await db
    .insert(schema.utilizadores)
    .values([
      { id: idUtilizador(1), nome: "Admin GS", email: "admin@demo.gs", perfil: "admin", passwordHash: hash },
      { id: idUtilizador(2), nome: "Rui Ferreira", email: "rui@demo.gs", perfil: "encarregado", passwordHash: hash },
      { id: idUtilizador(3), nome: "João Santos", email: "joao@demo.gs", perfil: "operador", passwordHash: hash },
      { id: idUtilizador(4), nome: "Manuel Rodrigues", email: "manuel@demo.gs", perfil: "qc", passwordHash: hash },
      { id: idUtilizador(5), nome: "Ana Carvalho", email: "ana@demo.gs", perfil: "operador", passwordHash: hash },
      { id: idUtilizador(6), nome: "Carlos Mendes", email: "carlos@demo.gs", perfil: "operador", passwordHash: hash },
      { id: idUtilizador(7), nome: "Pedro Almeida", email: "pedro@demo.gs", perfil: "operador", passwordHash: hash },
    ])
    .returning();
  const u = Object.fromEntries(users.map((x) => [x.email.split("@")[0], x]));
  const operadores = [u.joao, u.ana, u.carlos, u.pedro];

  // ----------------------------------------------------------
  // Obras
  // ----------------------------------------------------------
  console.log("→ Obras");
  const obrasCriadas = await db
    .insert(schema.obras)
    .values([
      {
        codigo: `TD-${ANO}-001`,
        nome: "Edifício Arco — Fachada Principal",
        cliente: "Arq. Silva & Associados",
        localObra: "Lisboa, Parque das Nações",
        tipoFachada: "ACM",
        totalM2: "847.50",
        estado: "em_producao",
        dataInicioProducao: dataISO(diasAtras(21)),
        dataEntregaPrevista: diasAFrente(55),
        encarregadoId: u.rui.id,
      },
      {
        codigo: `TD-${ANO}-002`,
        nome: "Centro Comercial Torres Novas",
        cliente: "Retail Properties SA",
        localObra: "Torres Novas",
        tipoFachada: "HPL",
        totalM2: "1240.00",
        estado: "em_producao",
        dataInicioProducao: dataISO(diasAtras(9)),
        dataEntregaPrevista: diasAFrente(101),
        encarregadoId: u.rui.id,
      },
      {
        codigo: `TD-${ANO}-003`,
        nome: "Hotel Quinta das Pedras",
        cliente: "Hospitality Group",
        localObra: "Sintra",
        tipoFachada: "GRC",
        totalM2: "320.00",
        estado: "planeamento",
        dataEntregaPrevista: diasAFrente(131),
        encarregadoId: u.rui.id,
        observacoes: "A aguardar aprovação de amostra de cor GRC 30mm Beige pelo arquitecto.",
      },
      {
        codigo: `TD-${ANO - 1}-018`,
        nome: "Pavilhão Multiusos Évora",
        cliente: "CM Évora",
        localObra: "Évora",
        tipoFachada: "ALUCOBOND",
        totalM2: "2100.00",
        estado: "concluida",
        dataInicioProducao: dataISO(diasAtras(140)),
        dataEntregaPrevista: dataISO(diasAtras(30)),
        dataEntregaReal: dataISO(diasAtras(23)),
        encarregadoId: u.rui.id,
      },
      {
        codigo: `TD-${ANO}-004`,
        nome: "Armazém Logístico Azambuja",
        cliente: "LogiPark SA",
        localObra: "Azambuja",
        tipoFachada: "ACM",
        totalM2: "580.00",
        estado: "em_producao",
        dataInicioProducao: dataISO(agora),
        dataEntregaPrevista: diasAFrente(40),
        encarregadoId: u.rui.id,
      },
    ])
    .returning();
  const obraPorSufixo = (s: string) => obrasCriadas.find((o) => o.codigo.endsWith(s))!;

  // ----------------------------------------------------------
  // Definição das OFs
  // ----------------------------------------------------------
  interface DefOF {
    numero: string;
    obraSufixo: string;
    descricao: string;
    zona: string;
    material: Material;
    grelha: GrelhaZona[];
    estado: schema.OrdemFabrico["estado"];
    prioridade: number;
    responsavel: schema.Utilizador;
    abertaHaDias: number;
    fechoPrevistoDias: number;
    produzidas: number;
    emProducao: number;
  }

  const defs: DefOF[] = [
    {
      numero: `OF-${ANO}-0089`,
      obraSufixo: "-001",
      descricao: "Revestimento ACM — Fachada Norte, pisos 1 a 6",
      zona: "Fachada Norte",
      material: MATERIAIS.acmPrata,
      grelha: [
        {
          zona: "Fachada Norte",
          larguras: [1200, 1200, 900, 600, 1200, 1200, 600, 900, 1200, 1200],
          alturas: [600, 600, 600, 600, 600, 600],
        },
      ],
      estado: "em_producao",
      prioridade: 1,
      responsavel: u.joao,
      abertaHaDias: 18,
      fechoPrevistoDias: 6,
      produzidas: 47,
      emProducao: 8,
    },
    {
      numero: `OF-${ANO}-0090`,
      obraSufixo: "-001",
      descricao: "Revestimento ACM — Fachada Sul, pisos 1 a 5",
      zona: "Fachada Sul",
      material: MATERIAIS.acmAntracite,
      grelha: [
        {
          zona: "Fachada Sul",
          larguras: [1200, 900, 1200, 1200, 600, 1200, 1200, 900, 1200],
          alturas: [600, 600, 600, 600, 600],
        },
      ],
      estado: "em_producao",
      prioridade: 2,
      responsavel: u.ana,
      abertaHaDias: 12,
      fechoPrevistoDias: 14,
      produzidas: 20,
      emProducao: 0,
    },
    {
      numero: `OF-${ANO}-0091`,
      obraSufixo: "-002",
      descricao: "Painéis HPL — Cobertura e Átrio de entrada",
      zona: "Cobertura + Átrio",
      material: MATERIAIS.hplBranco,
      grelha: [
        { zona: "Cobertura", larguras: [1200, 1200, 1200, 1200, 1200, 1200], alturas: [900, 900, 900, 900, 900] },
        { zona: "Átrio", larguras: [900, 900, 900, 900, 900, 900], alturas: [1200, 1200, 1200, 1200], pisoBase: 0 },
      ],
      estado: "em_producao",
      prioridade: 2,
      responsavel: u.carlos,
      abertaHaDias: 8,
      fechoPrevistoDias: 21,
      produzidas: 15,
      emProducao: 3,
    },
    {
      numero: `OF-${ANO}-0092`,
      obraSufixo: "-004",
      descricao: "Revestimento ACM — Fachada Geral do armazém",
      zona: "Fachada Geral",
      material: MATERIAIS.acmCinza,
      grelha: [
        {
          zona: "Fachada Geral",
          larguras: [1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200],
          alturas: [900, 900, 900, 900, 900],
        },
      ],
      estado: "em_espera",
      prioridade: 3,
      responsavel: u.pedro,
      abertaHaDias: 1,
      fechoPrevistoDias: 30,
      produzidas: 0,
      emProducao: 0,
    },
    {
      numero: `OF-${ANO - 1}-0061`,
      obraSufixo: "-018",
      descricao: "Revestimento ALUCOBOND — Fachada Poente do pavilhão",
      zona: "Fachada Poente",
      material: MATERIAIS.alucobondBronze,
      grelha: [
        {
          zona: "Fachada Poente",
          larguras: [1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500],
          alturas: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000],
        },
      ],
      estado: "concluida",
      prioridade: 2,
      responsavel: u.joao,
      abertaHaDias: 140,
      fechoPrevistoDias: -60,
      produzidas: 96,
      emProducao: 0,
    },
  ];

  console.log("→ Ordens de fabrico");
  const ofs = await db
    .insert(schema.ordensFabrico)
    .values(
      defs.map((d) => ({
        numero: d.numero,
        obraId: obraPorSufixo(d.obraSufixo).id,
        descricao: d.descricao,
        zona: d.zona,
        totalChapas: d.grelha.reduce((n, g) => n + g.larguras.length * g.alturas.length, 0),
        chapasProduzidasCount: d.produzidas,
        estado: d.estado,
        prioridade: d.prioridade,
        operadorResponsavelId: d.responsavel.id,
        dataAbertura: diasAtras(d.abertaHaDias, 8),
        dataFechoPrevisto: diasAFrente(d.fechoPrevistoDias),
        dataFechoReal: d.estado === "concluida" ? diasAtras(-d.fechoPrevistoDias + 5, 17) : null,
      })),
    )
    .returning();

  // ----------------------------------------------------------
  // Chapas, eventos, etiquetas
  // ----------------------------------------------------------
  type NovaChapa = typeof schema.chapas.$inferInsert;
  type NovoEvento = typeof schema.chapaEventos.$inferInsert;
  type NovaEtiqueta = typeof schema.etiquetasImpressas.$inferInsert;

  const chapasInserir: NovaChapa[] = [];
  const eventos: NovoEvento[] = [];
  const etiquetas: NovaEtiqueta[] = [];

  // Fila global das chapas activas já produzidas, para distribuir a produção no tempo.
  const filaActiva: { chapa: NovaChapa; def: DefOF }[] = [];

  for (const [i, def] of defs.entries()) {
    const of = ofs[i];
    const obra = obraPorSufixo(def.obraSufixo);
    const plano = planearChapas(def.grelha);
    const abertura = of.dataAbertura!;

    for (const p of plano) {
      const codigo = gerarCodigoChapa({
        ano: abertura.getFullYear(),
        mes: abertura.getMonth() + 1,
        numeroOf: sufixoOf(def.numero),
        sequencia: p.seq,
      });
      const m2 = calcularM2(p.largura, p.altura);
      const chapa: NovaChapa = {
        id: crypto.randomUUID(),
        codigo,
        qrCodeData: gerarPayloadQR({
          codigo,
          numeroOf: def.numero,
          codigoObra: obra.codigo,
          cliente: obra.cliente,
          zona: p.zona,
          largura: p.largura,
          altura: p.altura,
          material: def.material.nome,
        }),
        ofId: of.id,
        obraId: obra.id,
        largura: String(p.largura),
        altura: String(p.altura),
        espessura: String(def.material.espessura),
        m2: m2.toFixed(4),
        peso: (m2 * def.material.kgM2).toFixed(2),
        material: def.material.nome,
        cor: def.material.cor,
        acabamento: def.material.acabamento,
        zona: p.zona,
        piso: p.piso,
        coluna: p.coluna,
        linha: p.linha,
        posicaoX: p.posicaoX.toFixed(2),
        posicaoY: p.posicaoY.toFixed(2),
        estado: "por_produzir",
        createdAt: abertura,
        updatedAt: abertura,
      };
      chapasInserir.push(chapa);
      eventos.push({
        chapaId: chapa.id!,
        tipo: "criacao",
        descricao: `Chapa criada a partir da ${def.numero}`,
        estadoNovo: "por_produzir",
        utilizadorId: u.rui.id,
        timestamp: abertura,
      });
    }

    const daOf = chapasInserir.filter((c) => c.ofId === of.id);

    if (def.estado === "concluida") {
      // Obra concluída: todas instaladas, histórico completo há vários meses.
      let t = diasAtras(130, 7);
      for (const c of daOf) {
        t = new Date(t.getTime() + randInt(25, 60) * MIN);
        if (t.getHours() >= FIM_TURNO) {
          t.setDate(t.getDate() + 1);
          t.setHours(INICIO_TURNO, randInt(0, 30));
        }
        while (!eDiaUtil(t)) t.setDate(t.getDate() + 1);
        const op = escolher(operadores);
        const inicio = new Date(t.getTime() - randInt(50, 140) * MIN);
        const qc = new Date(t.getTime() + randInt(40, 240) * MIN);
        const exp = diasAtras(randInt(40, 50), 15);
        const inst = diasAtras(randInt(24, 38), 11);
        Object.assign(c, {
          estado: "instalada" satisfies EstadoChapa,
          operadorProducaoId: op.id,
          operadorQcId: u.manuel.id,
          dataInicioProd: inicio,
          dataFimProd: t,
          dataQC: qc,
          dataExpedicao: exp,
          dataInstalacao: inst,
          updatedAt: inst,
        });
        eventos.push(...historicoProducao(c, op, inicio, t, qc));
        eventos.push(
          { chapaId: c.id!, tipo: "expedicao", descricao: "Carregada na guia de remessa GR-" + randInt(1200, 1299), estadoAnterior: "aprovada_qc", estadoNovo: "expedida", utilizadorId: u.rui.id, timestamp: exp },
          { chapaId: c.id!, tipo: "instalacao", descricao: "Instalação confirmada em obra", estadoAnterior: "expedida", estadoNovo: "instalada", utilizadorId: u.rui.id, timestamp: inst, latitude: "38.57100000", longitude: "-7.91350000" },
        );
        etiquetas.push({ chapaId: c.id!, impressaPorId: u.rui.id, dataImpressao: inicio, impressora: "Zebra ZT230 — Corte", formato: "A6" });
      }
      continue;
    }

    daOf.slice(0, def.produzidas).forEach((chapa) => filaActiva.push({ chapa, def }));

    // Chapas em produção agora (a seguir às produzidas, na ordem de montagem).
    daOf.slice(def.produzidas, def.produzidas + def.emProducao).forEach((c, k) => {
      const op = operadores[(k + i) % operadores.length];
      // um caso acima do limite de 120 min para gerar alerta no dashboard
      const minutos = k === 0 && def.numero.endsWith("0089") ? 137 : randInt(4, 95);
      const inicio = minAtras(minutos);
      Object.assign(c, {
        estado: "em_producao" satisfies EstadoChapa,
        operadorProducaoId: op.id,
        dataInicioProd: inicio,
        updatedAt: inicio,
      });
      eventos.push({
        chapaId: c.id!,
        tipo: "inicio_producao",
        descricao: "Produção iniciada",
        estadoAnterior: "por_produzir",
        estadoNovo: "em_producao",
        utilizadorId: op.id,
        timestamp: inicio,
        metadados: { posto: POSTOS_TRABALHO[k % POSTOS_TRABALHO.length] },
      });
      etiquetas.push({ chapaId: c.id!, impressaPorId: op.id, dataImpressao: new Date(inicio.getTime() - 3 * MIN), impressora: "Zebra ZT230 — Corte", formato: "A6" });
    });
  }

  // Distribuir a produção concluída para trás no tempo, a partir de agora.
  // Intercala as OFs mantendo a ordem de sequência dentro de cada uma.
  const porOf = new Map<string, { chapa: NovaChapa; def: DefOF }[]>();
  for (const item of filaActiva) {
    const lista = porOf.get(item.def.numero) ?? [];
    lista.push(item);
    porOf.set(item.def.numero, lista);
  }
  const ordemGlobal: { chapa: NovaChapa; def: DefOF }[] = [];
  while ([...porOf.values()].some((l) => l.length)) {
    const candidatas = [...porOf.values()].filter((l) => l.length);
    // retira do fim → a mais recente primeiro
    ordemGlobal.push(escolher(candidatas).pop()!);
  }

  let cursor = recuarTempoUtil(agora, randInt(3, 8));
  const recencia = new Map<string, number>(); // posição por OF (0 = mais recente)
  for (const { chapa, def } of ordemGlobal) {
    const duracao = def.material === MATERIAIS.hplBranco ? randInt(60, 180) : randInt(45, 150);
    // Uma chapa é feita dentro do mesmo turno: se não couber, passa para o fim do turno anterior.
    let fim = cursor;
    const inicioTurno = new Date(fim);
    inicioTurno.setHours(INICIO_TURNO, 0, 0, 0);
    if (fim.getTime() - duracao * MIN < inicioTurno.getTime()) {
      fim = recuarTempoUtil(inicioTurno, randInt(5, 40));
    }
    const inicio = new Date(fim.getTime() - duracao * MIN);
    cursor = recuarTempoUtil(fim, randInt(12, 24));
    const op = escolher(operadores);
    const r = recencia.get(def.numero) ?? 0;
    recencia.set(def.numero, r + 1);

    Object.assign(chapa, {
      operadorProducaoId: op.id,
      dataInicioProd: inicio,
      dataFimProd: fim,
      updatedAt: fim,
    });
    etiquetas.push({ chapaId: chapa.id!, impressaPorId: op.id, dataImpressao: new Date(inicio.getTime() - 5 * MIN), impressora: "Zebra ZT230 — Corte", formato: "A6" });

    // As mais recentes aguardam QC; as mais antigas da OF-0089 já foram expedidas.
    const aguardaQc = r < (def.numero.endsWith("0089") ? 7 : 4);
    const expedida = def.numero.endsWith("0089") && r >= def.produzidas - 8;
    if (aguardaQc) {
      chapa.estado = "produzida";
      eventos.push(...historicoProducao(chapa, op, inicio, fim, null));
      continue;
    }
    const qc = new Date(Math.min(fim.getTime() + randInt(30, 180) * MIN, agora.getTime() - 2 * MIN));
    Object.assign(chapa, { estado: "aprovada_qc", operadorQcId: u.manuel.id, dataQC: qc, updatedAt: qc });
    eventos.push(...historicoProducao(chapa, op, inicio, fim, qc));
    if (expedida) {
      const exp = new Date(Math.min(qc.getTime() + randInt(1, 2) * 24 * 60 * MIN, agora.getTime() - 60 * MIN));
      Object.assign(chapa, { estado: "expedida", dataExpedicao: exp, updatedAt: exp });
      eventos.push({ chapaId: chapa.id!, tipo: "expedicao", descricao: "Carregada na guia de remessa GR-1347", estadoAnterior: "aprovada_qc", estadoNovo: "expedida", utilizadorId: u.rui.id, timestamp: exp, metadados: { guia: "GR-1347", viatura: "45-TD-12" } });
    }
  }

  // ----------------------------------------------------------
  // Não conformidades (OF-0089): 1 resolvida, 2 em aberto
  // ----------------------------------------------------------
  const of89 = ofs[0];
  const aprovadas89 = chapasInserir.filter((c) => c.ofId === of89.id && c.estado === "aprovada_qc");
  const [ncResolvida, ncRejeitada, ncRetrabalho] = [aprovadas89[2], aprovadas89[9], aprovadas89[15]];
  const ncs: (typeof schema.naoConformidades.$inferInsert)[] = [];

  // 1) Arranhão detectado em QC, retrabalhado e aprovado
  {
    const c = ncResolvida;
    const reprovacao = new Date(c.dataFimProd!.getTime() + 35 * MIN);
    c.dataQC = new Date(Math.min(reprovacao.getTime() + 140 * MIN, agora.getTime() - 2 * MIN));
    c.updatedAt = c.dataQC;
    c.temNaoConformidade = true;
    substituirQc(c, reprovacao, "Arranhão superficial na face vista, canto inferior direito.");
    eventos.push(
      { chapaId: c.id!, tipo: "retrabalho_inicio", descricao: "Polimento localizado e retoque de película", estadoAnterior: "rejeitada_qc", estadoNovo: "em_retrabalho", utilizadorId: c.operadorProducaoId, timestamp: new Date(reprovacao.getTime() + 40 * MIN) },
      { chapaId: c.id!, tipo: "retrabalho_fim", descricao: "Retrabalho concluído", estadoAnterior: "em_retrabalho", estadoNovo: "produzida", utilizadorId: c.operadorProducaoId, timestamp: new Date(reprovacao.getTime() + 95 * MIN) },
      { chapaId: c.id!, tipo: "qc_aprovado", descricao: "Conforme após retrabalho.", estadoAnterior: "produzida", estadoNovo: "aprovada_qc", utilizadorId: u.manuel.id, timestamp: c.dataQC },
    );
    ncs.push({ chapaId: c.id!, ofId: of89.id, tipo: "arranhao", descricao: "Arranhão superficial na face vista, canto inferior direito (≈ 40 mm).", severidade: "minor", reportadoPorId: u.manuel.id, dataReporte: reprovacao, acao: "retrabalho", resolvidaPorId: u.rui.id, dataResolucao: c.dataQC, estado: "resolvida" });
  }
  // 2) Deformação — rejeitada, a aguardar decisão
  {
    const c = ncRejeitada;
    c.temNaoConformidade = true;
    c.estado = "rejeitada_qc";
    substituirQc(c, c.dataQC!, "Deformação na quinagem da aba superior.");
    ncs.push({ chapaId: c.id!, ofId: of89.id, tipo: "deformacao", descricao: "Deformação na quinagem da aba superior — desvio de 3 mm face à tolerância de ±1 mm.", severidade: "major", reportadoPorId: u.manuel.id, dataReporte: c.dataQC, estado: "aberta" });
  }
  // 3) Corte incorrecto — em retrabalho
  {
    const c = ncRetrabalho;
    c.temNaoConformidade = true;
    c.estado = "em_retrabalho";
    substituirQc(c, c.dataQC!, "Furação de fixação desalinhada.");
    const inicioRetrab = new Date(Math.min(c.dataQC!.getTime() + 50 * MIN, agora.getTime() - 10 * MIN));
    eventos.push({ chapaId: c.id!, tipo: "retrabalho_inicio", descricao: "Reposicionamento da furação na CNC", estadoAnterior: "rejeitada_qc", estadoNovo: "em_retrabalho", utilizadorId: c.operadorProducaoId, timestamp: inicioRetrab, metadados: { posto: "Corte CNC Linha 1" } });
    ncs.push({ chapaId: c.id!, ofId: of89.id, tipo: "corte_incorrecto", descricao: "Furação de fixação desalinhada 6 mm em relação ao desenho de fabrico.", severidade: "major", reportadoPorId: u.manuel.id, dataReporte: c.dataQC, acao: "retrabalho", estado: "em_resolucao" });
  }

  /** Substitui o evento de QC aprovado da chapa por uma reprovação. */
  function substituirQc(c: NovaChapa, quando: Date, motivo: string) {
    const idx = eventos.findIndex((e) => e.chapaId === c.id && e.tipo === "qc_aprovado");
    if (idx >= 0) eventos.splice(idx, 1);
    eventos.push({ chapaId: c.id!, tipo: "qc_reprovado", descricao: motivo, estadoAnterior: "produzida", estadoNovo: "rejeitada_qc", utilizadorId: u.manuel.id, timestamp: quando });
  }

  function historicoProducao(c: NovaChapa, op: schema.Utilizador, inicio: Date, fim: Date, qc: Date | null): NovoEvento[] {
    const posto = escolher(POSTOS_TRABALHO);
    const ev: NovoEvento[] = [
      { chapaId: c.id!, tipo: "inicio_producao", descricao: "Produção iniciada", estadoAnterior: "por_produzir", estadoNovo: "em_producao", utilizadorId: op.id, timestamp: inicio, metadados: { posto } },
      { chapaId: c.id!, tipo: "fim_producao", descricao: "Produção concluída", estadoAnterior: "em_producao", estadoNovo: "produzida", utilizadorId: op.id, timestamp: fim, metadados: { posto, duracaoMin: Math.round((fim.getTime() - inicio.getTime()) / MIN) } },
    ];
    if (qc) {
      ev.push({ chapaId: c.id!, tipo: "qc_aprovado", descricao: escolher(["Conforme. Sem anomalias.", "Conforme. Dimensões e cor verificadas.", "Conforme."]), estadoAnterior: "produzida", estadoNovo: "aprovada_qc", utilizadorId: u.manuel.id, timestamp: qc });
    }
    return ev;
  }

  // ----------------------------------------------------------
  // Inserção em lotes
  // ----------------------------------------------------------
  console.log(`→ Chapas (${chapasInserir.length})`);
  for (let k = 0; k < chapasInserir.length; k += 200) {
    await db.insert(schema.chapas).values(chapasInserir.slice(k, k + 200));
  }
  console.log(`→ Eventos (${eventos.length})`);
  for (let k = 0; k < eventos.length; k += 500) {
    await db.insert(schema.chapaEventos).values(eventos.slice(k, k + 500));
  }
  console.log(`→ Etiquetas (${etiquetas.length}) e não conformidades (${ncs.length})`);
  await db.insert(schema.etiquetasImpressas).values(etiquetas);
  await db.insert(schema.naoConformidades).values(ncs);

  console.log("✓ Seed concluído");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
