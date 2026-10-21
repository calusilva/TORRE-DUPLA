# GS ERP Industrial — Demo Torre Dupla

Demonstração do GS ERP Industrial para a Torre Dupla, Lda.: gestão de chapas por obra,
rastreabilidade individual por QR Code e controlo de produção em tempo real.
Especificação completa em [PROMPT.md](PROMPT.md).

## Arranque

Requisitos: Node 20+ e PostgreSQL 16+.

```bash
cp .env.example .env.local        # ajustar DATABASE_URL e gerar AUTH_SECRET
createdb gs_erp_demo
npm install
npm run db:reset                  # aplica migrações + seed
npm run dev
```

Abrir http://localhost:3000 e entrar com uma conta de demonstração (palavra-passe `demo123`):

| Email            | Perfil       |
| ---------------- | ------------ |
| admin@demo.gs    | Admin        |
| rui@demo.gs      | Encarregado  |
| joao@demo.gs     | Operador     |
| manuel@demo.gs   | Inspector QC |

> As datas do seed são relativas ao momento em que corre. Antes de uma apresentação,
> correr `npm run db:seed` para que o dashboard mostre a produção "de hoje".

## Demonstração

| Ecrã | Endereço | Notas |
| ---- | -------- | ----- |
| Layout visual | `/obras/:id/layout-visual` (ou `/obras/:id/layout`) | Actualiza sozinho quando uma chapa é lida noutro dispositivo (~1 s) |
| Dashboard TV | `/producao?tv=1` (ou `/dashboard`) | Ocupa o ecrã todo; tecla **F** = ecrã inteiro; SSE a cada 5 s |
| Scan | `/producao/scan` (ou `/scan`) | Câmara, leitor USB/Bluetooth ou código manual (atalho `89-44`) |
| Rastreabilidade | `/rastreabilidade/:codigo` | Pública — é o que abre ao ler o QR com a câmara do telemóvel |
| Fila de QC | `/qc` | Aprovar/reprovar inline (FIFO), NC com tipo, severidade e acção |
| Stock | `/stock` | Simulação (sem Primavera): reservas, movimentos, consumos por OF; MAT-008 abaixo do mínimo |
| Relatórios | `/relatorios/producao` | Hoje / semana / mês / intervalo, por obra e OF |

**Rede local (tablets e telemóveis):** arrancar com `npm run dev:rede` (ou `npm run build && npm run start:rede`)
e abrir a aplicação **pelo IP do computador** (ex.: `http://192.168.1.50:3000`) — também para imprimir
etiquetas, porque o QR Code usa o endereço pelo qual a aplicação foi aberta.

**Câmara nos tablets:** os browsers só dão acesso à câmara em HTTPS (ou `localhost`). Opções:
`npm run dev:https` (certificado auto-assinado — aceitar o aviso no tablet), um túnel HTTPS, ou usar
o leitor USB/Bluetooth, que funciona em HTTP.

## Stock (simulação)

As saídas de stock são automáticas: quando uma chapa entra em produção é abatido o seu consumo
teórico (e devolvido se a produção for suspensa). O modelo está em `src/lib/consumos.ts`:
alumínio = m² × espessura × 2,7 kg · isolamento = m² · perfis = perímetro × 1,2 ·
EPDM = perímetro · fixações = 8/chapa · tinta em pó = 0,12 kg/m² (RAL 9006 / 7016).
A coluna "Reservado" considera as chapas por produzir; as já iniciadas já deram saída.

## Etiquetas

- `GET /api/chapas/:id/etiqueta?formato=A6_individual` — etiqueta de uma chapa
- `POST /api/qr/gerar` `{ chapaIds, formato: "A4_4por_pagina" | "A6_individual" | "rolo", incluirBarcode }` — lote

Cada etiqueta tem QR Code + Code 128. O conteúdo do QR é definido por `QR_CONTEUDO`
(`json`, como na especificação, ou `url` para abrir a rastreabilidade com a câmara do telemóvel).
Todas as impressões ficam registadas em `etiquetas_impressas` (com indicação de reimpressão).

## Scripts

| Script               | Descrição                                   |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento                 |
| `npm run db:generate`| Gera migração a partir de `src/db/schema.ts`|
| `npm run db:migrate` | Aplica migrações                            |
| `npm run db:seed`    | Repõe os dados de demonstração              |
| `npm run db:studio`  | Drizzle Studio                              |
| `npm run typecheck`  | Verificação de tipos                        |
