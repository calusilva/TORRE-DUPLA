import { z } from "zod";
import { ESTADOS_OBRA, TIPOS_FACHADA } from "@/lib/dominio";
import { interpretarPadrao } from "@/lib/fachada";
import { materialPorId } from "@/lib/materiais";

const textoOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();
const dataOpcional = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida")
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();
const uuidOpcional = z
  .string()
  .transform((v) => (v === "" || v === "nenhum" ? null : v))
  .pipe(z.uuid().nullable())
  .optional();

export const obraSchema = z
  .object({
    nome: z.string().trim().min(3, "Indique o nome da obra").max(200),
    cliente: z.string().trim().min(2, "Indique o cliente").max(150),
    localObra: textoOpcional,
    tipoFachada: z.enum(TIPOS_FACHADA, "Seleccione o tipo de fachada"),
    totalM2: z.coerce.number("Área inválida").positive("A área tem de ser superior a 0").max(99_999_999),
    dataInicioProducao: dataOpcional,
    dataEntregaPrevista: dataOpcional,
    estado: z.enum(ESTADOS_OBRA).optional(),
    encarregadoId: uuidOpcional,
    observacoes: textoOpcional,
  })
  .refine(
    (o) => !o.dataInicioProducao || !o.dataEntregaPrevista || o.dataEntregaPrevista >= o.dataInicioProducao,
    { path: ["dataEntregaPrevista"], message: "A entrega não pode ser anterior ao início de produção" },
  );

export const MAX_CHAPAS_LOTE = 2000;

/** Lote de chapas: grelha de fachada + material. */
export const loteChapasSchema = z
  .object({
    zona: z.string().trim().min(2, "Indique a zona").max(100),
    materialId: z.string().refine((id) => !!materialPorId(id), "Seleccione o material"),
    larguras: z.string().transform((v, ctx) => {
      const r = interpretarPadrao(v);
      if (!r) ctx.addIssue({ code: "custom", message: "Padrão de larguras inválido (ex.: 1200x4, 900, 600)" });
      return r ?? [];
    }),
    alturas: z.string().transform((v, ctx) => {
      const r = interpretarPadrao(v);
      if (!r) ctx.addIssue({ code: "custom", message: "Padrão de alturas inválido (ex.: 600x6)" });
      return r ?? [];
    }),
    pisoBase: z.coerce.number().int().min(-5).max(100).default(1),
  })
  .superRefine((l, ctx) => {
    const n = l.larguras.length * l.alturas.length;
    if (n > MAX_CHAPAS_LOTE) ctx.addIssue({ code: "custom", path: ["larguras"], message: `Máximo de ${MAX_CHAPAS_LOTE} chapas por lote (pedido: ${n})` });
    const fora = [...l.larguras, ...l.alturas].find((v) => v < 100 || v > 6000);
    if (fora) ctx.addIssue({ code: "custom", path: ["larguras"], message: `Medida fora dos limites de fabrico (100–6000 mm): ${fora}` });
  });

export type LoteChapas = z.infer<typeof loteChapasSchema>;

export const ofSchema = z
  .object({
    obraId: z.uuid("Seleccione a obra"),
    descricao: z.string().trim().min(3, "Indique a descrição").max(300),
    zona: textoOpcional,
    prioridade: z.coerce.number().int().min(1).max(3),
    dataFechoPrevisto: dataOpcional,
    operadorResponsavelId: uuidOpcional,
  });

/** Converte erros zod em { campo: mensagem }. */
export function errosPorCampo(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const campo = String(issue.path[0] ?? "_");
    out[campo] ??= issue.message;
  }
  return out;
}

export type ResultadoAccao<T = undefined> =
  | ({ ok: true; mensagem?: string } & (T extends undefined ? { dados?: undefined } : { dados: T }))
  | { ok: false; erro: string; campos?: Record<string, string> };
