CREATE TABLE "chapa_eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapa_id" uuid NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"descricao" text,
	"estado_anterior" varchar(30),
	"estado_novo" varchar(30),
	"utilizador_id" uuid,
	"timestamp" timestamp with time zone DEFAULT now(),
	"foto_url" varchar(500),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"metadados" jsonb
);
--> statement-breakpoint
CREATE TABLE "chapas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"qr_code_data" text NOT NULL,
	"of_id" uuid NOT NULL,
	"obra_id" uuid NOT NULL,
	"largura" numeric(8, 2) NOT NULL,
	"altura" numeric(8, 2) NOT NULL,
	"espessura" numeric(5, 2),
	"m2" numeric(8, 4) NOT NULL,
	"peso" numeric(8, 2),
	"material" varchar(80),
	"cor" varchar(80),
	"acabamento" varchar(80),
	"zona" varchar(100),
	"piso" integer,
	"coluna" varchar(10),
	"linha" integer,
	"posicao_x" numeric(8, 2),
	"posicao_y" numeric(8, 2),
	"estado" varchar(30) DEFAULT 'por_produzir' NOT NULL,
	"data_inicio_prod" timestamp with time zone,
	"data_fim_prod" timestamp with time zone,
	"data_qc" timestamp with time zone,
	"data_expedicao" timestamp with time zone,
	"data_instalacao" timestamp with time zone,
	"operador_producao_id" uuid,
	"operador_qc_id" uuid,
	"tem_nao_conformidade" boolean DEFAULT false NOT NULL,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "chapas_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "etiquetas_impressas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapa_id" uuid NOT NULL,
	"impressa_por_id" uuid,
	"data_impressao" timestamp with time zone DEFAULT now(),
	"impressora" varchar(100),
	"formato" varchar(20) DEFAULT 'A6',
	"reimpressao" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "nao_conformidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapa_id" uuid NOT NULL,
	"of_id" uuid,
	"tipo" varchar(80) NOT NULL,
	"descricao" text NOT NULL,
	"severidade" varchar(20) NOT NULL,
	"reportado_por_id" uuid,
	"data_reporte" timestamp with time zone DEFAULT now(),
	"acao" varchar(80),
	"resolvida_por_id" uuid,
	"data_resolucao" timestamp with time zone,
	"foto_url" varchar(500),
	"estado" varchar(20) DEFAULT 'aberta' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nome" varchar(200) NOT NULL,
	"cliente" varchar(150) NOT NULL,
	"local_obra" varchar(200),
	"tipo_fachada" varchar(50) NOT NULL,
	"total_m2" numeric(10, 2) NOT NULL,
	"data_inicio_producao" date,
	"data_entrega_prevista" date,
	"data_entrega_real" date,
	"estado" varchar(30) DEFAULT 'em_producao' NOT NULL,
	"encarregado_id" uuid,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "obras_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "ordens_fabrico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" varchar(30) NOT NULL,
	"obra_id" uuid NOT NULL,
	"descricao" varchar(300) NOT NULL,
	"zona" varchar(100),
	"total_chapas" integer NOT NULL,
	"chapas_produzidas_count" integer DEFAULT 0 NOT NULL,
	"estado" varchar(30) DEFAULT 'em_espera' NOT NULL,
	"data_abertura" timestamp with time zone DEFAULT now(),
	"data_fecho_previsto" date,
	"data_fecho_real" timestamp with time zone,
	"prioridade" integer DEFAULT 2 NOT NULL,
	"operador_responsavel_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "ordens_fabrico_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "utilizadores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(100) NOT NULL,
	"email" varchar(150) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"perfil" varchar(30) NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "utilizadores_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "chapa_eventos" ADD CONSTRAINT "chapa_eventos_chapa_id_chapas_id_fk" FOREIGN KEY ("chapa_id") REFERENCES "public"."chapas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapa_eventos" ADD CONSTRAINT "chapa_eventos_utilizador_id_utilizadores_id_fk" FOREIGN KEY ("utilizador_id") REFERENCES "public"."utilizadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapas" ADD CONSTRAINT "chapas_of_id_ordens_fabrico_id_fk" FOREIGN KEY ("of_id") REFERENCES "public"."ordens_fabrico"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapas" ADD CONSTRAINT "chapas_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapas" ADD CONSTRAINT "chapas_operador_producao_id_utilizadores_id_fk" FOREIGN KEY ("operador_producao_id") REFERENCES "public"."utilizadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapas" ADD CONSTRAINT "chapas_operador_qc_id_utilizadores_id_fk" FOREIGN KEY ("operador_qc_id") REFERENCES "public"."utilizadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etiquetas_impressas" ADD CONSTRAINT "etiquetas_impressas_chapa_id_chapas_id_fk" FOREIGN KEY ("chapa_id") REFERENCES "public"."chapas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etiquetas_impressas" ADD CONSTRAINT "etiquetas_impressas_impressa_por_id_utilizadores_id_fk" FOREIGN KEY ("impressa_por_id") REFERENCES "public"."utilizadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nao_conformidades" ADD CONSTRAINT "nao_conformidades_chapa_id_chapas_id_fk" FOREIGN KEY ("chapa_id") REFERENCES "public"."chapas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nao_conformidades" ADD CONSTRAINT "nao_conformidades_of_id_ordens_fabrico_id_fk" FOREIGN KEY ("of_id") REFERENCES "public"."ordens_fabrico"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nao_conformidades" ADD CONSTRAINT "nao_conformidades_reportado_por_id_utilizadores_id_fk" FOREIGN KEY ("reportado_por_id") REFERENCES "public"."utilizadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nao_conformidades" ADD CONSTRAINT "nao_conformidades_resolvida_por_id_utilizadores_id_fk" FOREIGN KEY ("resolvida_por_id") REFERENCES "public"."utilizadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras" ADD CONSTRAINT "obras_encarregado_id_utilizadores_id_fk" FOREIGN KEY ("encarregado_id") REFERENCES "public"."utilizadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordens_fabrico" ADD CONSTRAINT "ordens_fabrico_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordens_fabrico" ADD CONSTRAINT "ordens_fabrico_operador_responsavel_id_utilizadores_id_fk" FOREIGN KEY ("operador_responsavel_id") REFERENCES "public"."utilizadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chapa_eventos_chapa_idx" ON "chapa_eventos" USING btree ("chapa_id");--> statement-breakpoint
CREATE INDEX "chapa_eventos_timestamp_idx" ON "chapa_eventos" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "chapas_of_idx" ON "chapas" USING btree ("of_id");--> statement-breakpoint
CREATE INDEX "chapas_obra_idx" ON "chapas" USING btree ("obra_id");--> statement-breakpoint
CREATE INDEX "chapas_estado_idx" ON "chapas" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "nao_conformidades_chapa_idx" ON "nao_conformidades" USING btree ("chapa_id");--> statement-breakpoint
CREATE INDEX "ordens_fabrico_obra_idx" ON "ordens_fabrico" USING btree ("obra_id");