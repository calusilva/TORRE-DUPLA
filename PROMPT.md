# PROMPT DE IMPLEMENTAÇÃO — GS ERP INDUSTRIAL DEMO | TORRE DUPLA

## CONTEXTO DO PROJETO

Estás a construir uma aplicação web de demonstração do GS ERP Industrial para a empresa Torre Dupla, Lda. — fabricante de fachadas e painéis compósitos. Esta demo vai ser apresentada à equipa de gestão e produção da empresa para validar o conceito antes da implementação real do sistema completo (6 módulos, 14.000€ + IVA, contrato já negociado).

A demo deve cobrir o coração operacional da Torre Dupla: gestão de chapas/painéis por obra, rastreabilidade individual por QR Code, e controlo de produção em tempo real. É o equivalente funcional dos Módulos 2, 3 e parcialmente 5 do contrato.

Esta não é uma prova de conceito genérica. Deve parecer e comportar-se como software real, com dados realistas da indústria de fachadas, terminologia correcta, e fluxos que um operador de chão de fábrica ou encarregado reconheceria imediatamente.

## STACK TECNOLÓGICA

```
Framework:     Next.js 15 (App Router, Server Actions)
UI:            React 19 + Tailwind CSS + shadcn/ui
Base de dados: PostgreSQL (Drizzle ORM)
QR/Barcode:    qrcode (geração) + @zxing/library (leitura via câmara)
Estado:        Zustand (cliente) + React Query / TanStack Query (server state)
PDF:           @react-pdf/renderer (etiquetas e relatórios)
Gráficos:      Recharts
Auth:          NextAuth.js v5 (simples, 3 perfis: Admin, Encarregado, Operador)
Notificações:  Sonner (toasts) + Server-Sent Events para updates em tempo real
```

Instalar tudo de raiz — iniciar com:

```bash
npx create-next-app@latest gs-erp-demo --typescript --tailwind --app --src-dir
cd gs-erp-demo
npx shadcn@latest init
```

## ESTRUTURA DE BASE DE DADOS

Schema Drizzle ORM — ficheiro `src/db/schema.ts`

```typescript
// ============================================================
// OBRAS
// ============================================================
export const obras = pgTable('obras', {
  id: uuid('id').primaryKey().defaultRandom(),
  codigo: varchar('codigo', { length: 20 }).notNull().unique(), // TD-2024-001
  nome: varchar('nome', { length: 200 }).notNull(),
  cliente: varchar('cliente', { length: 150 }).notNull(),
  localObra: varchar('local_obra', { length: 200 }),
  tipoFachada: varchar('tipo_fachada', { length: 50 }).notNull(),
  // Tipos: 'ACM' | 'HPL' | 'GRC' | 'ALUCOBOND' | 'VITROCSA'
  totalM2: decimal('total_m2', { precision: 10, scale: 2 }).notNull(),
  dataInicioProducao: date('data_inicio_producao'),
  dataEntregaPrevista: date('data_entrega_prevista'),
  dataEntregaReal: date('data_entrega_real'),
  estado: varchar('estado', { length: 30 }).notNull().default('em_producao'),
  // Estados: 'planeamento' | 'em_producao' | 'concluida' | 'expedida'
  encarregadoId: uuid('encarregado_id').references(() => utilizadores.id),
  observacoes: text('observacoes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// ORDENS DE FABRICO
// ============================================================
export const ordensFabrico = pgTable('ordens_fabrico', {
  id: uuid('id').primaryKey().defaultRandom(),
  numero: varchar('numero', { length: 30 }).notNull().unique(), // OF-2024-0089
  obraId: uuid('obra_id').notNull().references(() => obras.id),
  descricao: varchar('descricao', { length: 300 }).notNull(),
  zona: varchar('zona', { length: 100 }), // "Fachada Norte", "Cobertura", "Átrio"
  totalChapas: integer('total_chapas').notNull(),
  chapasProduzidasCount: integer('chapas_produzidas_count').notNull().default(0),
  estado: varchar('estado', { length: 30 }).notNull().default('em_espera'),
  // Estados: 'em_espera' | 'em_producao' | 'suspensa' | 'concluida' | 'cancelada'
  dataAbertura: timestamp('data_abertura').defaultNow(),
  dataFechoPrevisto: date('data_fecho_previsto'),
  dataFechoReal: timestamp('data_fecho_real'),
  prioridade: integer('prioridade').notNull().default(2), // 1=Alta 2=Normal 3=Baixa
  operadorResponsavelId: uuid('operador_responsavel_id').references(() => utilizadores.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// CHAPAS (entidade central — uma chapa = uma placa física)
// ============================================================
export const chapas = pgTable('chapas', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Identificação
  codigo: varchar('codigo', { length: 50 }).notNull().unique(),
  // Formato: TD-{AnoMes}-{OF}-{SEQ4} ex: TD-2410-0089-0001
  qrCodeData: text('qr_code_data').notNull(), // JSON string com dados completos

  // Relações
  ofId: uuid('of_id').notNull().references(() => ordensFabrico.id),
  obraId: uuid('obra_id').notNull().references(() => obras.id),

  // Dimensões físicas
  largura: decimal('largura', { precision: 8, scale: 2 }).notNull(), // mm
  altura: decimal('altura', { precision: 8, scale: 2 }).notNull(),   // mm
  espessura: decimal('espessura', { precision: 5, scale: 2 }),       // mm
  m2: decimal('m2', { precision: 8, scale: 4 }).notNull(),           // calculado
  peso: decimal('peso', { precision: 8, scale: 2 }),                  // kg
  material: varchar('material', { length: 80 }),
  // ex: 'ACM 4mm Prata Mate', 'HPL 10mm Branco', 'GRC 30mm Beige'
  cor: varchar('cor', { length: 80 }),
  acabamento: varchar('acabamento', { length: 80 }),

  // Layout — posição na fachada
  zona: varchar('zona', { length: 100 }),    // "Fachada Norte"
  piso: integer('piso'),                      // 3
  coluna: varchar('coluna', { length: 10 }), // "B", "C4"
  linha: integer('linha'),                    // posição vertical
  posicaoX: decimal('posicao_x', { precision: 8, scale: 2 }), // px no layout visual
  posicaoY: decimal('posicao_y', { precision: 8, scale: 2 }),

  // Estado de produção
  estado: varchar('estado', { length: 30 }).notNull().default('por_produzir'),
  // Estados possíveis:
  // 'por_produzir'  → ainda não iniciada
  // 'em_producao'   → operador iniciou, trabalho a decorrer
  // 'produzida'     → concluída em fábrica, aguarda QC
  // 'aprovada_qc'   → passou controlo de qualidade
  // 'rejeitada_qc'  → reprovada, requer retrabalho
  // 'em_retrabalho' → em correcção
  // 'expedida'      → saiu das instalações
  // 'instalada'     → confirmada em obra

  // Tracking temporal
  dataInicioProd: timestamp('data_inicio_prod'),
  dataFimProd: timestamp('data_fim_prod'),
  dataQC: timestamp('data_qc'),
  dataExpedicao: timestamp('data_expedicao'),
  dataInstalacao: timestamp('data_instalacao'),

  // Operadores
  operadorProducaoId: uuid('operador_producao_id').references(() => utilizadores.id),
  operadorQcId: uuid('operador_qc_id').references(() => utilizadores.id),

  // Não conformidades
  temNaoConformidade: boolean('tem_nao_conformidade').notNull().default(false),

  // Metadados
  observacoes: text('observacoes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// EVENTOS / HISTÓRICO DE CADA CHAPA
// ============================================================
export const chapaEventos = pgTable('chapa_eventos', {
  id: uuid('id').primaryKey().defaultRandom(),
  chapaId: uuid('chapa_id').notNull().references(() => chapas.id),

  tipo: varchar('tipo', { length: 50 }).notNull(),
  // 'criacao' | 'inicio_producao' | 'fim_producao' | 'qc_aprovado' |
  // 'qc_reprovado' | 'retrabalho_inicio' | 'retrabalho_fim' |
  // 'expedicao' | 'instalacao' | 'observacao' | 'scan_qr'

  descricao: text('descricao'),
  estadoAnterior: varchar('estado_anterior', { length: 30 }),
  estadoNovo: varchar('estado_novo', { length: 30 }),

  utilizadorId: uuid('utilizador_id').references(() => utilizadores.id),
  timestamp: timestamp('timestamp').defaultNow(),

  // Para não conformidades
  fotoUrl: varchar('foto_url', { length: 500 }),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),

  metadados: jsonb('metadados'), // dados extra por tipo de evento
});

// ============================================================
// NÃO CONFORMIDADES
// ============================================================
export const naoConformidades = pgTable('nao_conformidades', {
  id: uuid('id').primaryKey().defaultRandom(),
  chapaId: uuid('chapa_id').notNull().references(() => chapas.id),
  ofId: uuid('of_id').references(() => ordensFabrico.id),

  tipo: varchar('tipo', { length: 80 }).notNull(),
  // 'arranhao' | 'deformacao' | 'corte_incorrecto' | 'cor_errada' |
  // 'dimensao_errada' | 'defeito_material' | 'outro'

  descricao: text('descricao').notNull(),
  severidade: varchar('severidade', { length: 20 }).notNull(), // 'minor' | 'major' | 'critica'

  reportadoPorId: uuid('reportado_por_id').references(() => utilizadores.id),
  dataReporte: timestamp('data_reporte').defaultNow(),

  acao: varchar('acao', { length: 80 }),
  // 'retrabalho' | 'substituicao' | 'aceite_condicional' | 'sucata'

  resolvidaPorId: uuid('resolvida_por_id').references(() => utilizadores.id),
  dataResolucao: timestamp('data_resolucao'),

  fotoUrl: varchar('foto_url', { length: 500 }),
  estado: varchar('estado', { length: 20 }).notNull().default('aberta'),
  // 'aberta' | 'em_resolucao' | 'resolvida' | 'fechada'
});

// ============================================================
// UTILIZADORES
// ============================================================
export const utilizadores = pgTable('utilizadores', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: varchar('nome', { length: 100 }).notNull(),
  email: varchar('email', { length: 150 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  perfil: varchar('perfil', { length: 30 }).notNull(),
  // 'admin' | 'encarregado' | 'operador' | 'qc'
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================
// ETIQUETAS IMPRESSAS
// ============================================================
export const etiquetasImpressas = pgTable('etiquetas_impressas', {
  id: uuid('id').primaryKey().defaultRandom(),
  chapaId: uuid('chapa_id').notNull().references(() => chapas.id),
  impressaPorId: uuid('impressa_por_id').references(() => utilizadores.id),
  dataImpressao: timestamp('data_impressao').defaultNow(),
  impressora: varchar('impressora', { length: 100 }),
  formato: varchar('formato', { length: 20 }).default('A6'),
  reimpressao: boolean('reimpressao').default(false),
});
```

## ARQUITECTURA DE PÁGINAS E ROTAS

Estrutura `src/app/`

```
app/
├── (auth)/
│   └── login/page.tsx
├── (dashboard)/
│   ├── layout.tsx              ← sidebar + header globais
│   ├── page.tsx                ← dashboard principal (redirect para /obras)
│   ├── obras/
│   │   ├── page.tsx            ← lista de obras
│   │   ├── nova/page.tsx       ← criar obra
│   │   └── [obraId]/
│   │       ├── page.tsx        ← detalhe da obra + resumo OFs
│   │       └── layout-visual/page.tsx  ← LAYOUT VISUAL DAS CHAPAS ★
│   ├── of/
│   │   ├── page.tsx            ← lista de OFs
│   │   ├── nova/page.tsx       ← criar OF
│   │   └── [ofId]/
│   │       ├── page.tsx        ← detalhe OF + lista chapas
│   │       └── chapas/[chapaId]/page.tsx  ← ficha individual chapa
│   ├── producao/
│   │   ├── page.tsx            ← dashboard chão de fábrica (TEMPO REAL) ★
│   │   └── scan/page.tsx       ← scan QR Code (interface operador) ★
│   ├── rastreabilidade/
│   │   └── [codigo]/page.tsx   ← histórico completo de uma chapa
│   ├── qc/
│   │   └── page.tsx            ← fila de QC + registo de não conformidades
│   └── relatorios/
│       └── page.tsx            ← relatório de produção por OF/período
├── api/
│   ├── chapas/
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       ├── estado/route.ts        ← mudar estado via scan
│   │       └── etiqueta/route.ts      ← gerar PDF etiqueta
│   ├── of/route.ts
│   ├── obras/route.ts
│   ├── producao/
│   │   └── dashboard/route.ts         ← SSE endpoint
│   └── qr/
│       └── gerar/route.ts             ← gerar batch de QR Codes
└── layout.tsx
```

## FUNCIONALIDADES CORE — IMPLEMENTAÇÃO DETALHADA

### 1. SISTEMA DE CÓDIGOS E QR CODES

Geração do código de chapa:

```typescript
// src/lib/codigos.ts
export function gerarCodigoChapa(params: {
  ano: number;
  mes: number;
  numeroOf: string;     // "0089"
  sequencia: number;    // 1, 2, 3...
}): string {
  const anoMes = `${String(params.ano).slice(-2)}${String(params.mes).padStart(2, '0')}`;
  const seq = String(params.sequencia).padStart(4, '0');
  return `TD-${anoMes}-${params.numeroOf}-${seq}`;
  // Resultado: TD-2410-0089-0001
}

// Dados codificados no QR Code (JSON minificado):
interface QRCodePayload {
  c: string;     // código: "TD-2410-0089-0001"
  of: string;    // número OF: "OF-2024-0089"
  ob: string;    // código obra: "TD-2024-001"
  cl: string;    // cliente: "Arq. Silva & Assoc."
  z: string;     // zona: "Fachada Norte"
  d: string;     // dimensões: "1200x600"
  m: string;     // material: "ACM 4mm Prata"
  url: string;   // link rastreabilidade: "/rastreabilidade/TD-2410-0089-0001"
}
```

Etiqueta PDF (componente React PDF):

```
┌────────────────────────────────────────┐
│  [LOGO GS ERP]          TORRE DUPLA    │
│────────────────────────────────────────│
│  TD-2410-0089-0001                     │
│  ████████████  OF: OF-2024-0089        │
│  █ QR CODE  █  OBRA: TD-2024-001       │
│  ████████████  Cliente: Arq. Silva     │
│                                        │
│  ZONA: Fachada Norte  PISO: 3          │
│  DIMENSÕES: 1.200 × 600 mm             │
│  MATERIAL: ACM 4mm Prata Mate          │
│  ÁREA: 0,72 m²  │  PESO: ~8,5 kg      │
│────────────────────────────────────────│
│  ││││││││││││││││││││  [Barcode 128]   │
│  TD-2410-0089-0001                     │
└────────────────────────────────────────┘
Formato A6 landscape — 148 × 105 mm
```

### 2. LAYOUT VISUAL DAS CHAPAS ★ (página mais importante da demo)

Rota: `/obras/[obraId]/layout-visual`

Esta é a funcionalidade que vai impressionar a Torre Dupla. Mostra uma representação visual da fachada com cada chapa no seu lugar, com cor a indicar o estado de produção.

Lógica de layout:

```typescript
// Cada chapa tem posicaoX, posicaoY, largura, altura no schema
// O layout é um SVG/canvas responsivo que renderiza todas as chapas
// numa grade que representa a fachada real

interface ChapaLayout {
  id: string;
  codigo: string;
  posicaoX: number;  // posição relativa em px (escala configurável)
  posicaoY: number;
  largura: number;   // em px escalados
  altura: number;
  estado: EstadoChapa;
  zona: string;
  operador?: string;
}
```

Implementação do componente visual:

```tsx
// src/components/layout-visual/FachadaCanvas.tsx
// Usar SVG + React para máxima flexibilidade

const CORES_ESTADO = {
  por_produzir:  '#e5e7eb', // cinza claro
  em_producao:   '#fbbf24', // amarelo âmbar (pulsante!)
  produzida:     '#86efac', // verde claro
  aprovada_qc:   '#22c55e', // verde forte
  rejeitada_qc:  '#f87171', // vermelho
  em_retrabalho: '#fb923c', // laranja
  expedida:      '#60a5fa', // azul
  instalada:     '#a78bfa', // roxo
} as const;

// A chapa "em_producao" deve ter animação CSS pulse
// Ao hover: tooltip com código, operador, dimensões, tempo em produção
// Ao click: abre drawer lateral com ficha completa da chapa
// Botão "Iniciar produção" / "Marcar como produzida" directamente no drawer
```

Controlos do layout:

- Filtro por zona (dropdown: Fachada Norte, Sul, Este, Cobertura...)
- Zoom in/out (slider)
- Toggle: mostrar/ocultar códigos nas chapas
- Toggle: mostrar/ocultar grid de pisos
- Legenda de cores sempre visível
- Contador no topo: "X/Y chapas produzidas (Z%)"
- Botão "Gerar QR Codes em batch" (selecciona todas as "por_produzir" e imprime PDF em lote)

Barra de progresso por zona:

```
Fachada Norte  ████████████░░░  78% (47/60)
Fachada Sul    ██████░░░░░░░░░  42% (25/60)
Cobertura      ░░░░░░░░░░░░░░░   0% (0/24)
```

### 3. DASHBOARD DE PRODUÇÃO EM TEMPO REAL ★

Rota: `/producao`

Dashboard destinado ao ecrã grande do chão de fábrica (TV em modo fullscreen). Auto-refresh a cada 30 segundos via SSE, ou botão manual.

Layout do dashboard (grid 12 colunas):

```
┌─────────────────────────────────────────────────────────────┐
│  GS ERP Industrial | Torre Dupla          Qua 16 Out 09:42  │
├────────────┬────────────┬────────────┬──────────────────────┤
│  PRODUZIDAS│  EM PROD.  │  POR PROD. │  NÃO CONFORMIDADES   │
│    247     │     12     │    89      │         3            │
│  chapas    │  chapas    │  chapas    │       abertas        │
├────────────┴────────────┴────────────┴──────────────────────┤
│                                                             │
│  OFs ACTIVAS                          PRODUÇÃO HOJE        │
│  ┌─────────────────────────────┐      ┌──────────────────┐ │
│  │ OF-2024-0089  Arq. Silva    │      │  32 chapas       │ │
│  │ ████████░░  78% 47/60       │      │  23,4 m²         │ │
│  │ Zona: Fachada Norte         │      │  Meta: 40/dia    │ │
│  │ Encarregado: Rui Ferreira   │      │  80% atingido    │ │
│  ├─────────────────────────────┤      └──────────────────┘ │
│  │ OF-2024-0091  Torres Novas  │                           │
│  │ ███░░░░░░░  28% 15/54       │      ÚLTIMA ACTIVIDADE    │
│  │ Zona: Cobertura + Átrio     │      ┌──────────────────┐ │
│  └─────────────────────────────┘      │ 09:38 TD-..0034  │ │
│                                       │ ✓ Produzida       │ │
│  CHAPAS EM PRODUÇÃO AGORA             │ Op: J.Santos      │ │
│  ┌──────┐ ┌──────┐ ┌──────┐          │                  │ │
│  │0089  │ │0089  │ │0091  │          │ 09:31 TD-..0033  │ │
│  │-0044 │ │-0045 │ │-0003 │          │ ✓ Produzida       │ │
│  │ 32m  │ │ 18m  │ │  7m  │          │ Op: M.Rodrigues  │ │
│  └──────┘ └──────┘ └──────┘          └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Cada card de "chapa em produção" mostra:

- Código da chapa
- Tempo decorrido desde início (contador a subir)
- Operador responsável
- Dimensões e zona
- Alerta se passar threshold (ex: >120min para uma chapa standard)

### 4. INTERFACE DE SCAN QR CODE ★

Rota: `/producao/scan`

Interface simplificada para operadores no tablet/telemóvel. Design minimalista, botões grandes, funciona com câmara ou leitor físico USB.

Fluxo de scan:

1. Operador abre `/producao/scan`
2. Câmara activa — aponta para QR Code da chapa
3. Sistema lê o código → busca dados na BD → mostra ficha da chapa
4. Interface apresenta botões de acção conforme estado actual:

```
Estado actual → Botões disponíveis:
─────────────────────────────────────────────
'por_produzir'  → [▶ INICIAR PRODUÇÃO]
'em_producao'   → [✓ MARCAR COMO PRODUZIDA] [⏸ SUSPENDER]
'produzida'     → [✓ APROVAR QC] [✗ REPROVAR QC]
'aprovada_qc'   → [📦 REGISTAR EXPEDIÇÃO]
'expedida'      → [📍 CONFIRMAR INSTALAÇÃO]
─────────────────────────────────────────────
```

UI da página de scan:

```
// Modo câmara: painel superior com viewfinder
// Linha de scan animada a percorrer o QR
// Input alternativo: campo de texto para código manual (útil com leitor USB)

// Após scan bem-sucedido — mostra card:
┌──────────────────────────────────────┐
│  TD-2410-0089-0044                   │
│  OF-2024-0089 | Arq. Silva & Assoc.  │
│  Fachada Norte | Piso 3 | Col. C4   │
│  1.200 × 600 mm | ACM 4mm Prata     │
│  Estado: EM PRODUÇÃO (há 32 min)    │
├──────────────────────────────────────┤
│                                      │
│   [✓ MARCAR COMO PRODUZIDA]         │
│                                      │
│   [⚠ REPORTAR PROBLEMA]             │
│                                      │
└──────────────────────────────────────┘
```

Server Action para mudança de estado:

```typescript
// src/app/actions/chapas.ts
'use server'

export async function mudarEstadoChapa(params: {
  chapaId: string;
  novoEstado: EstadoChapa;
  utilizadorId: string;
  observacao?: string;
  fotoBase64?: string;
}): Promise<{ success: boolean; chapa?: Chapa; error?: string }> {
  // 1. Validar transição de estado (máquina de estados)
  // 2. Actualizar chapa na BD
  // 3. Criar evento no histórico
  // 4. Actualizar contador na OF correspondente
  // 5. Se 'produzida': actualizar chapasProduzidasCount na OF
  // 6. Retornar estado actualizado
}
```

Máquina de estados válida:

```typescript
const TRANSICOES_VALIDAS: Record<EstadoChapa, EstadoChapa[]> = {
  por_produzir:  ['em_producao'],
  em_producao:   ['produzida', 'por_produzir'], // pode reverter
  produzida:     ['aprovada_qc', 'rejeitada_qc'],
  aprovada_qc:   ['expedida'],
  rejeitada_qc:  ['em_retrabalho'],
  em_retrabalho: ['produzida'],
  expedida:      ['instalada'],
  instalada:     [], // estado final
};
```

### 5. FICHA DE RASTREABILIDADE

Rota: `/rastreabilidade/[codigo]`

Página pública (sem login) acessível via QR Code. Mostra o histórico completo de uma chapa.

```
┌─────────────────────────────────────────────────┐
│  GS ERP Industrial | Torre Dupla               │
│  RASTREABILIDADE DE CHAPA                       │
├─────────────────────────────────────────────────┤
│  TD-2410-0089-0044                              │
│  OF-2024-0089 | Arq. Silva & Associados         │
│  Fachada Norte — Piso 3 — Coluna C4            │
│  Material: ACM 4mm Prata Mate                   │
│  Dimensões: 1.200 × 600 mm | 0,72 m²           │
├─────────────────────────────────────────────────┤
│  ESTADO ACTUAL: ✓ APROVADA QC                  │
├─────────────────────────────────────────────────┤
│  HISTÓRICO                                      │
│                                                 │
│  ● 2024-10-15 09:14  INÍCIO PRODUÇÃO           │
│    Operador: João Santos                        │
│    Posto: Corte CNC Linha 2                     │
│                                                 │
│  ● 2024-10-15 11:47  PRODUÇÃO CONCLUÍDA        │
│    Duração: 2h 33m                              │
│    Operador: João Santos                        │
│                                                 │
│  ● 2024-10-15 14:22  APROVADA QC               │
│    Inspector: Manuel Rodrigues                  │
│    Observações: Conforme. Sem anomalias.        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 6. GERAÇÃO EM BATCH DE ETIQUETAS

Rota API: `POST /api/qr/gerar`

Gera um PDF com múltiplas etiquetas para impressão em lote:

```typescript
// Recebe: array de chapaIds
// Gera: PDF A4 com layout de etiquetas (2 por linha em A4, ou 1 por linha em rolo)
// Cada etiqueta: QR Code + código de barras + dados da chapa
// Formato configurável: A4 (4 etiquetas/página) ou rolo contínuo

interface BatchEtiquetasRequest {
  chapaIds: string[];
  formato: 'A4_4por_pagina' | 'A6_individual' | 'rolo';
  incluirBarcode: boolean;
}
```

## DADOS DE SEED — DEMO REALISTA

Criar ficheiro `src/db/seed.ts` com dados que simulem uma empresa real:

### Obras (5 obras em diferentes estados)

```typescript
const obrasDemo = [
  {
    codigo: 'TD-2024-001',
    nome: 'Edifício Arco — Fachada Principal',
    cliente: 'Arq. Silva & Associados',
    localObra: 'Lisboa, Parque das Nações',
    tipoFachada: 'ACM',
    totalM2: 847.5,
    estado: 'em_producao',
    dataEntregaPrevista: '2024-12-15',
  },
  {
    codigo: 'TD-2024-002',
    nome: 'Centro Comercial Torres Novas',
    cliente: 'Retail Properties SA',
    localObra: 'Torres Novas',
    tipoFachada: 'HPL',
    totalM2: 1240.0,
    estado: 'em_producao',
    dataEntregaPrevista: '2025-01-30',
  },
  {
    codigo: 'TD-2024-003',
    nome: 'Hotel Quinta das Pedras',
    cliente: 'Hospitality Group',
    localObra: 'Sintra',
    tipoFachada: 'GRC',
    totalM2: 320.0,
    estado: 'planeamento',
    dataEntregaPrevista: '2025-03-01',
  },
  {
    codigo: 'TD-2023-018',
    nome: 'Pavilhão Multiusos Évora',
    cliente: 'CM Évora',
    localObra: 'Évora',
    tipoFachada: 'ALUCOBOND',
    totalM2: 2100.0,
    estado: 'concluida',
    dataEntregaReal: '2024-09-28',
  },
  {
    codigo: 'TD-2024-004',
    nome: 'Armazém Logístico Azambuja',
    cliente: 'LogiPark SA',
    localObra: 'Azambuja',
    tipoFachada: 'ACM',
    totalM2: 580.0,
    estado: 'em_producao',
    dataEntregaPrevista: '2024-11-30',
  },
];
```

### OFs e Chapas

- **OF-2024-0089** (obra TD-2024-001): 60 chapas ACM 4mm Prata, zona Fachada Norte
  - 47 produzidas/aprovadas, 8 em produção, 5 por produzir
  - 3 com não conformidades (1 resolvida, 2 abertas)
- **OF-2024-0090** (obra TD-2024-001): 45 chapas ACM 4mm Antracite, zona Fachada Sul
  - 20 produzidas, 25 por produzir
- **OF-2024-0091** (obra TD-2024-002): 54 chapas HPL 10mm Branco, Cobertura + Átrio
  - 15 produzidas, 3 em produção, 36 por produzir
- **OF-2024-0092** (obra TD-2024-004): 80 chapas ACM 3mm Cinza RAL7035, Fachada Geral
  - 0 produzidas (recentemente aberta)

### Utilizadores demo

```typescript
const utilizadoresDemo = [
  { nome: 'Admin GS', email: 'admin@demo.gs', perfil: 'admin', password: 'demo123' },
  { nome: 'Rui Ferreira', email: 'rui@demo.gs', perfil: 'encarregado', password: 'demo123' },
  { nome: 'João Santos', email: 'joao@demo.gs', perfil: 'operador', password: 'demo123' },
  { nome: 'Manuel Rodrigues', email: 'manuel@demo.gs', perfil: 'qc', password: 'demo123' },
  { nome: 'Ana Carvalho', email: 'ana@demo.gs', perfil: 'operador', password: 'demo123' },
];
```

### Para o layout visual — posições das chapas

As chapas da OF-2024-0089 devem ter posições X/Y calculadas para formar uma grelha de fachada realista (10 colunas × 6 filas). Gerar em loop com espaçamento de 2px entre chapas, chapas de diferentes dimensões (mix de 1200×600, 900×600, 600×600 mm).

## COMPONENTES UI ESPECÍFICOS

### Sidebar de navegação

```
GS ERP Industrial
━━━━━━━━━━━━━━━━
📋 Obras
📦 Ordens de Fabrico
🏭 Produção (badge com nº activas)
🔍 Rastreabilidade
✅ Controlo Qualidade
📊 Relatórios
━━━━━━━━━━━━━━━━
⚙ Configurações
```

### Badges de estado das chapas (componente reutilizável)

```tsx
// src/components/ui/EstadoChapaBadge.tsx
// Usar variantes do shadcn/ui Badge com cores customizadas
// Ícone + texto + cor de fundo consistente com o layout visual
```

### Componente de progresso por OF

```tsx
// Barra de progresso com:
// - Total produzidas / total chapas
// - Percentagem
// - Cor: verde se >75%, amarelo se 25-75%, vermelho se <25%
// - Sub-barra fina com "em produção agora" (cor âmbar)
```

## INSTRUÇÕES DE DESENVOLVIMENTO — ORDEM DE IMPLEMENTAÇÃO

Seguir esta ordem para ter algo funcional rapidamente:

**Sprint 1 — Base (dia 1-2):**

1. Setup Next.js 15 + Drizzle + PostgreSQL + shadcn/ui
2. Schema da BD + migrations + seed inicial
3. Auth simples com NextAuth.js (3 perfis)
4. Layout geral (sidebar + header)

**Sprint 2 — Core (dia 3-4):**

5. CRUD de Obras
6. CRUD de Ordens de Fabrico
7. Geração de chapas em batch a partir de uma OF (com códigos automáticos)
8. Geração de QR Codes + PDF de etiquetas

**Sprint 3 — Funcionalidades estrela (dia 5-6):**

9. Layout visual das chapas — componente SVG interactivo
10. Dashboard de produção — tempo real via SSE
11. Interface de scan — câmara + mudança de estado

**Sprint 4 — Polimento (dia 7):**

12. Página de rastreabilidade
13. Registo de não conformidades
14. Relatório de produção (tabela + gráfico barras diário)
15. Seed com dados realistas completos
16. Responsividade mobile (interface scan)

## REQUISITOS DE QUALIDADE

- Português europeu em toda a interface (sem "você", sem "você pode", sem "ao")
- Terminologia correcta da indústria: "chapa" (não "painel"), "OF" (não "ordem de produção"), "QC" (não "controlo de qualidade" por extenso), "encarregado" (não "supervisor")
- Performance: lista de chapas com virtualização se >200 registos (react-virtual ou tanstack/virtual)
- Feedback imediato: todos os botões de acção devem ter estado de loading + toast de confirmação
- Erro handling: estados de erro visíveis, não crashar silenciosamente
- Mobile-first na página de scan (`/producao/scan`) — operadores usam tablets
- Fullscreen mode no dashboard de produção (`/producao`) — para TV do chão de fábrica
- Dark mode opcional (Tailwind `dark:`) — útil para o dashboard em ecrã grande

## VARIÁVEIS DE AMBIENTE

```env
# .env.local
DATABASE_URL="postgresql://usuario:password@localhost:5432/gs_erp_demo"
NEXTAUTH_SECRET="gs-erp-demo-secret-key-2024"
NEXTAUTH_URL="http://localhost:3000"

# Opcional — para upload de fotos de não conformidades
UPLOAD_DIR="/tmp/gs-erp-uploads"
MAX_FILE_SIZE=5242880
```

## NOTAS FINAIS PARA O PROGRAMADOR

- A página `/obras/[obraId]/layout-visual` é o centrepiece da demo — investir tempo extra aqui. A Torre Dupla vai ver isto e perceber imediatamente o valor do sistema.
- O scan de QR Code deve funcionar em mobile — testar em iOS Safari e Android Chrome. Usar `@zxing/library` que tem melhor compatibilidade que outras alternativas.
- O dashboard `/producao` deve ser impressionante — pensar como se fosse um ecrã de controlo de missão. Os números grandes, as cores vibrantes, o tempo a correr em tempo real.
- Os dados de seed devem contar uma história — não usar Lorem Ipsum ou dados genéricos. Chapas com nomes reais de obras, clientes como "Arq. Silva & Associados", tempos de produção realistas (uma chapa ACM demora entre 45 min e 3h dependendo da complexidade).
- Este sistema vai ser apresentado à direcção da Torre Dupla — deve parecer software de produção real, não um protótipo estudantil.

Quando o repositório Git estiver criado, iniciar com o Sprint 1 e fazer commit por funcionalidade.

```bash
git init
git add .
git commit -m "feat: initial Next.js 15 setup with Drizzle ORM schema"
```
