import {
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { EstadoChapa, EstadoObra, EstadoOF, Perfil } from "@/lib/dominio";

// ============================================================
// UTILIZADORES
// ============================================================
export const utilizadores = pgTable("utilizadores", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: varchar("nome", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  perfil: varchar("perfil", { length: 30 }).$type<Perfil>().notNull(),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// OBRAS
// ============================================================
export const obras = pgTable("obras", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(), // TD-2024-001
  nome: varchar("nome", { length: 200 }).notNull(),
  cliente: varchar("cliente", { length: 150 }).notNull(),
  localObra: varchar("local_obra", { length: 200 }),
  tipoFachada: varchar("tipo_fachada", { length: 50 }).notNull(),
  totalM2: decimal("total_m2", { precision: 10, scale: 2 }).notNull(),
  dataInicioProducao: date("data_inicio_producao"),
  dataEntregaPrevista: date("data_entrega_prevista"),
  dataEntregaReal: date("data_entrega_real"),
  estado: varchar("estado", { length: 30 }).$type<EstadoObra>().notNull().default("em_producao"),
  encarregadoId: uuid("encarregado_id").references(() => utilizadores.id),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// ORDENS DE FABRICO
// ============================================================
export const ordensFabrico = pgTable(
  "ordens_fabrico",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    numero: varchar("numero", { length: 30 }).notNull().unique(), // OF-2024-0089
    obraId: uuid("obra_id").notNull().references(() => obras.id),
    descricao: varchar("descricao", { length: 300 }).notNull(),
    zona: varchar("zona", { length: 100 }),
    totalChapas: integer("total_chapas").notNull(),
    chapasProduzidasCount: integer("chapas_produzidas_count").notNull().default(0),
    estado: varchar("estado", { length: 30 }).$type<EstadoOF>().notNull().default("em_espera"),
    dataAbertura: timestamp("data_abertura", { withTimezone: true }).defaultNow(),
    dataFechoPrevisto: date("data_fecho_previsto"),
    dataFechoReal: timestamp("data_fecho_real", { withTimezone: true }),
    prioridade: integer("prioridade").notNull().default(2), // 1=Alta 2=Normal 3=Baixa
    operadorResponsavelId: uuid("operador_responsavel_id").references(() => utilizadores.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("ordens_fabrico_obra_idx").on(t.obraId)],
);

// ============================================================
// CHAPAS (entidade central — uma chapa = uma placa física)
// ============================================================
export const chapas = pgTable(
  "chapas",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Identificação — formato TD-{AnoMes}-{OF}-{SEQ4}, ex: TD-2410-0089-0001
    codigo: varchar("codigo", { length: 50 }).notNull().unique(),
    qrCodeData: text("qr_code_data").notNull(),

    ofId: uuid("of_id").notNull().references(() => ordensFabrico.id),
    obraId: uuid("obra_id").notNull().references(() => obras.id),

    // Dimensões físicas (mm, m², kg)
    largura: decimal("largura", { precision: 8, scale: 2 }).notNull(),
    altura: decimal("altura", { precision: 8, scale: 2 }).notNull(),
    espessura: decimal("espessura", { precision: 5, scale: 2 }),
    m2: decimal("m2", { precision: 8, scale: 4 }).notNull(),
    peso: decimal("peso", { precision: 8, scale: 2 }),
    material: varchar("material", { length: 80 }),
    cor: varchar("cor", { length: 80 }),
    acabamento: varchar("acabamento", { length: 80 }),

    // Layout — posição na fachada
    zona: varchar("zona", { length: 100 }),
    piso: integer("piso"),
    coluna: varchar("coluna", { length: 10 }),
    linha: integer("linha"),
    posicaoX: decimal("posicao_x", { precision: 8, scale: 2 }),
    posicaoY: decimal("posicao_y", { precision: 8, scale: 2 }),

    estado: varchar("estado", { length: 30 }).$type<EstadoChapa>().notNull().default("por_produzir"),

    dataInicioProd: timestamp("data_inicio_prod", { withTimezone: true }),
    dataFimProd: timestamp("data_fim_prod", { withTimezone: true }),
    dataQC: timestamp("data_qc", { withTimezone: true }),
    dataExpedicao: timestamp("data_expedicao", { withTimezone: true }),
    dataInstalacao: timestamp("data_instalacao", { withTimezone: true }),

    operadorProducaoId: uuid("operador_producao_id").references(() => utilizadores.id),
    operadorQcId: uuid("operador_qc_id").references(() => utilizadores.id),

    temNaoConformidade: boolean("tem_nao_conformidade").notNull().default(false),

    observacoes: text("observacoes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("chapas_of_idx").on(t.ofId),
    index("chapas_obra_idx").on(t.obraId),
    index("chapas_estado_idx").on(t.estado),
  ],
);

// ============================================================
// EVENTOS / HISTÓRICO DE CADA CHAPA
// ============================================================
export const chapaEventos = pgTable(
  "chapa_eventos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chapaId: uuid("chapa_id").notNull().references(() => chapas.id),
    tipo: varchar("tipo", { length: 50 }).notNull(),
    descricao: text("descricao"),
    estadoAnterior: varchar("estado_anterior", { length: 30 }),
    estadoNovo: varchar("estado_novo", { length: 30 }),
    utilizadorId: uuid("utilizador_id").references(() => utilizadores.id),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
    fotoUrl: varchar("foto_url", { length: 500 }),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    metadados: jsonb("metadados"),
  },
  (t) => [
    index("chapa_eventos_chapa_idx").on(t.chapaId),
    index("chapa_eventos_timestamp_idx").on(t.timestamp),
  ],
);

// ============================================================
// NÃO CONFORMIDADES
// ============================================================
export const naoConformidades = pgTable(
  "nao_conformidades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chapaId: uuid("chapa_id").notNull().references(() => chapas.id),
    ofId: uuid("of_id").references(() => ordensFabrico.id),
    tipo: varchar("tipo", { length: 80 }).notNull(),
    descricao: text("descricao").notNull(),
    severidade: varchar("severidade", { length: 20 }).notNull(),
    reportadoPorId: uuid("reportado_por_id").references(() => utilizadores.id),
    dataReporte: timestamp("data_reporte", { withTimezone: true }).defaultNow(),
    acao: varchar("acao", { length: 80 }),
    resolvidaPorId: uuid("resolvida_por_id").references(() => utilizadores.id),
    dataResolucao: timestamp("data_resolucao", { withTimezone: true }),
    fotoUrl: varchar("foto_url", { length: 500 }),
    estado: varchar("estado", { length: 20 }).notNull().default("aberta"),
  },
  (t) => [index("nao_conformidades_chapa_idx").on(t.chapaId)],
);

// ============================================================
// ETIQUETAS IMPRESSAS
// ============================================================
export const etiquetasImpressas = pgTable("etiquetas_impressas", {
  id: uuid("id").primaryKey().defaultRandom(),
  chapaId: uuid("chapa_id").notNull().references(() => chapas.id),
  impressaPorId: uuid("impressa_por_id").references(() => utilizadores.id),
  dataImpressao: timestamp("data_impressao", { withTimezone: true }).defaultNow(),
  impressora: varchar("impressora", { length: 100 }),
  formato: varchar("formato", { length: 20 }).default("A6"),
  reimpressao: boolean("reimpressao").default(false),
});

// ============================================================
// RELAÇÕES (para db.query.*)
// ============================================================
export const obrasRelations = relations(obras, ({ one, many }) => ({
  encarregado: one(utilizadores, { fields: [obras.encarregadoId], references: [utilizadores.id] }),
  ordensFabrico: many(ordensFabrico),
  chapas: many(chapas),
}));

export const ordensFabricoRelations = relations(ordensFabrico, ({ one, many }) => ({
  obra: one(obras, { fields: [ordensFabrico.obraId], references: [obras.id] }),
  operadorResponsavel: one(utilizadores, {
    fields: [ordensFabrico.operadorResponsavelId],
    references: [utilizadores.id],
  }),
  chapas: many(chapas),
}));

export const chapasRelations = relations(chapas, ({ one, many }) => ({
  of: one(ordensFabrico, { fields: [chapas.ofId], references: [ordensFabrico.id] }),
  obra: one(obras, { fields: [chapas.obraId], references: [obras.id] }),
  operadorProducao: one(utilizadores, {
    fields: [chapas.operadorProducaoId],
    references: [utilizadores.id],
    relationName: "operadorProducao",
  }),
  operadorQc: one(utilizadores, {
    fields: [chapas.operadorQcId],
    references: [utilizadores.id],
    relationName: "operadorQc",
  }),
  eventos: many(chapaEventos),
  naoConformidades: many(naoConformidades),
  etiquetas: many(etiquetasImpressas),
}));

export const chapaEventosRelations = relations(chapaEventos, ({ one }) => ({
  chapa: one(chapas, { fields: [chapaEventos.chapaId], references: [chapas.id] }),
  utilizador: one(utilizadores, { fields: [chapaEventos.utilizadorId], references: [utilizadores.id] }),
}));

export const naoConformidadesRelations = relations(naoConformidades, ({ one }) => ({
  chapa: one(chapas, { fields: [naoConformidades.chapaId], references: [chapas.id] }),
  of: one(ordensFabrico, { fields: [naoConformidades.ofId], references: [ordensFabrico.id] }),
  reportadoPor: one(utilizadores, {
    fields: [naoConformidades.reportadoPorId],
    references: [utilizadores.id],
    relationName: "reportadoPor",
  }),
  resolvidaPor: one(utilizadores, {
    fields: [naoConformidades.resolvidaPorId],
    references: [utilizadores.id],
    relationName: "resolvidaPor",
  }),
}));

export const etiquetasImpressasRelations = relations(etiquetasImpressas, ({ one }) => ({
  chapa: one(chapas, { fields: [etiquetasImpressas.chapaId], references: [chapas.id] }),
  impressaPor: one(utilizadores, { fields: [etiquetasImpressas.impressaPorId], references: [utilizadores.id] }),
}));

export const utilizadoresRelations = relations(utilizadores, ({ many }) => ({
  chapasProduzidas: many(chapas, { relationName: "operadorProducao" }),
  chapasInspeccionadas: many(chapas, { relationName: "operadorQc" }),
  ncReportadas: many(naoConformidades, { relationName: "reportadoPor" }),
  ncResolvidas: many(naoConformidades, { relationName: "resolvidaPor" }),
}));

export type Utilizador = typeof utilizadores.$inferSelect;
export type Obra = typeof obras.$inferSelect;
export type OrdemFabrico = typeof ordensFabrico.$inferSelect;
export type Chapa = typeof chapas.$inferSelect;
export type ChapaEvento = typeof chapaEventos.$inferSelect;
export type NaoConformidade = typeof naoConformidades.$inferSelect;
export type EtiquetaImpressa = typeof etiquetasImpressas.$inferSelect;
