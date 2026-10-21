// Constantes de domínio partilhadas entre BD, servidor e UI.

export const ESTADOS_CHAPA = [
  "por_produzir",
  "em_producao",
  "produzida",
  "aprovada_qc",
  "rejeitada_qc",
  "em_retrabalho",
  "expedida",
  "instalada",
] as const;
export type EstadoChapa = (typeof ESTADOS_CHAPA)[number];

export const LABEL_ESTADO_CHAPA: Record<EstadoChapa, string> = {
  por_produzir: "Por produzir",
  em_producao: "Em produção",
  produzida: "Produzida",
  aprovada_qc: "Aprovada QC",
  rejeitada_qc: "Rejeitada QC",
  em_retrabalho: "Em retrabalho",
  expedida: "Expedida",
  instalada: "Instalada",
};

export const CORES_ESTADO: Record<EstadoChapa, string> = {
  por_produzir: "#e5e7eb",
  em_producao: "#fbbf24",
  produzida: "#86efac",
  aprovada_qc: "#22c55e",
  rejeitada_qc: "#f87171",
  em_retrabalho: "#fb923c",
  expedida: "#60a5fa",
  instalada: "#a78bfa",
};

export const TRANSICOES_VALIDAS: Record<EstadoChapa, EstadoChapa[]> = {
  por_produzir: ["em_producao"],
  em_producao: ["produzida", "por_produzir"],
  produzida: ["aprovada_qc", "rejeitada_qc"],
  aprovada_qc: ["expedida"],
  rejeitada_qc: ["em_retrabalho"],
  em_retrabalho: ["produzida"],
  expedida: ["instalada"],
  instalada: [],
};

// Estados em que a chapa já passou pelo fabrico (contam para chapasProduzidasCount),
// incluindo as que estão em QC/retrabalho.
export const ESTADOS_PRODUZIDOS: EstadoChapa[] = [
  "produzida",
  "aprovada_qc",
  "rejeitada_qc",
  "em_retrabalho",
  "expedida",
  "instalada",
];

// Postos de trabalho da fábrica (usados nos eventos de produção).
export const POSTOS_TRABALHO = [
  "Corte CNC Linha 1",
  "Corte CNC Linha 2",
  "Fresagem e Quinagem",
  "Montagem de Cassetes",
] as const;

// Acima deste tempo uma chapa standard em produção gera alerta.
export const LIMITE_MINUTOS_PRODUCAO = 120;

export const ESTADOS_OBRA = ["planeamento", "em_producao", "concluida", "expedida"] as const;
export type EstadoObra = (typeof ESTADOS_OBRA)[number];

export const LABEL_ESTADO_OBRA: Record<EstadoObra, string> = {
  planeamento: "Planeamento",
  em_producao: "Em produção",
  concluida: "Concluída",
  expedida: "Expedida",
};

export const TIPOS_FACHADA = ["ACM", "HPL", "GRC", "ALUCOBOND", "VITROCSA"] as const;
export type TipoFachada = (typeof TIPOS_FACHADA)[number];

export const ESTADOS_OF = ["em_espera", "em_producao", "suspensa", "concluida", "cancelada"] as const;
export type EstadoOF = (typeof ESTADOS_OF)[number];

export const LABEL_ESTADO_OF: Record<EstadoOF, string> = {
  em_espera: "Em espera",
  em_producao: "Em produção",
  suspensa: "Suspensa",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const PRIORIDADES = { 1: "Alta", 2: "Normal", 3: "Baixa" } as const;

export const PERFIS = ["admin", "encarregado", "operador", "qc"] as const;
export type Perfil = (typeof PERFIS)[number];

export const LABEL_PERFIL: Record<Perfil, string> = {
  admin: "Administrador",
  encarregado: "Encarregado",
  operador: "Operador",
  qc: "Inspector QC",
};

export const TIPOS_EVENTO = [
  "criacao",
  "inicio_producao",
  "fim_producao",
  "qc_aprovado",
  "qc_reprovado",
  "retrabalho_inicio",
  "retrabalho_fim",
  "expedicao",
  "instalacao",
  "observacao",
  "scan_qr",
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const TIPOS_NC = [
  "arranhao",
  "deformacao",
  "corte_incorrecto",
  "cor_errada",
  "dimensao_errada",
  "defeito_material",
  "outro",
] as const;
export type TipoNC = (typeof TIPOS_NC)[number];

export const LABEL_TIPO_NC: Record<TipoNC, string> = {
  arranhao: "Arranhão",
  deformacao: "Deformação",
  corte_incorrecto: "Corte incorrecto",
  cor_errada: "Cor errada",
  dimensao_errada: "Dimensão errada",
  defeito_material: "Defeito de material",
  outro: "Outro",
};

export const SEVERIDADES_NC = ["minor", "major", "critica"] as const;
export type SeveridadeNC = (typeof SEVERIDADES_NC)[number];

export const ACOES_NC = ["retrabalho", "substituicao", "aceite_condicional", "sucata"] as const;
export type AcaoNC = (typeof ACOES_NC)[number];

export const ESTADOS_NC = ["aberta", "em_resolucao", "resolvida", "fechada"] as const;
export type EstadoNC = (typeof ESTADOS_NC)[number];
