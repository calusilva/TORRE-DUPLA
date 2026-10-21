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

## Scripts

| Script               | Descrição                                   |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento                 |
| `npm run db:generate`| Gera migração a partir de `src/db/schema.ts`|
| `npm run db:migrate` | Aplica migrações                            |
| `npm run db:seed`    | Repõe os dados de demonstração              |
| `npm run db:studio`  | Drizzle Studio                              |
| `npm run typecheck`  | Verificação de tipos                        |
