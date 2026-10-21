CREATE TABLE "materiais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nome" varchar(100) NOT NULL,
	"unidade" varchar(20) NOT NULL,
	"stock_atual" numeric(10, 2) DEFAULT '0' NOT NULL,
	"stock_minimo" numeric(10, 2) NOT NULL,
	"stock_maximo" numeric(10, 2),
	"preco_unitario" numeric(10, 4),
	"fornecedor" varchar(150),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "materiais_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "movimentos_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"quantidade" numeric(10, 2) NOT NULL,
	"quantidade_anterior" numeric(10, 2) NOT NULL,
	"quantidade_nova" numeric(10, 2) NOT NULL,
	"motivo" varchar(200),
	"fornecedor" varchar(150),
	"of_id" uuid,
	"utilizador_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "movimentos_stock" ADD CONSTRAINT "movimentos_stock_material_id_materiais_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materiais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_stock" ADD CONSTRAINT "movimentos_stock_of_id_ordens_fabrico_id_fk" FOREIGN KEY ("of_id") REFERENCES "public"."ordens_fabrico"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_stock" ADD CONSTRAINT "movimentos_stock_utilizador_id_utilizadores_id_fk" FOREIGN KEY ("utilizador_id") REFERENCES "public"."utilizadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movimentos_stock_material_idx" ON "movimentos_stock" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "movimentos_stock_data_idx" ON "movimentos_stock" USING btree ("created_at");