// Formatação pt-PT (números, datas, durações).

// Separador de milhares "." (convenção dos desenhos de fabrico: 1.200 × 600 mm), decimal ",".
const nf = (min: number, max: number) => {
  const f = new Intl.NumberFormat("pt-PT", { minimumFractionDigits: min, maximumFractionDigits: max, useGrouping: "always" } as Intl.NumberFormatOptions);
  return { format: (n: number) => f.format(n).replace(/[\u00a0\u202f\s]/g, ".") };
};

const NF0 = nf(0, 0);
const NF1 = nf(0, 1);
const NF2 = nf(2, 2);

type Num = number | string | null | undefined;
const num = (v: Num) => (v === null || v === undefined || v === "" ? NaN : Number(v));

export function fmtInt(v: Num) {
  const n = num(v);
  return Number.isFinite(n) ? NF0.format(n) : "—";
}

/** 1.200 × 600 mm */
export function fmtDimensoes(largura: Num, altura: Num) {
  return `${fmtInt(largura)} × ${fmtInt(altura)} mm`;
}

/** 0,72 m² */
export function fmtM2(v: Num, casas = 2) {
  const n = num(v);
  if (!Number.isFinite(n)) return "—";
  return `${(casas === 2 ? NF2 : nf(casas, casas)).format(n)} m²`;
}

/** 8,5 kg */
export function fmtKg(v: Num) {
  const n = num(v);
  return Number.isFinite(n) ? `${NF1.format(n)} kg` : "—";
}

export function fmtPct(v: number) {
  return `${Math.round(v)}%`;
}

type DataLike = Date | string | null | undefined;
const data = (d: DataLike) => (d ? (d instanceof Date ? d : new Date(d)) : null);

const DF_DATA = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
const DF_DATA_CURTA = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", year: "numeric" });
const DF_DATA_HORA = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const DF_HORA = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" });

/** Datas "YYYY-MM-DD" (colunas date) são interpretadas em hora local. */
function dataLocal(d: DataLike) {
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [a, m, dia] = d.split("-").map(Number);
    return new Date(a, m - 1, dia);
  }
  return data(d);
}

export const fmtData = (d: DataLike) => (dataLocal(d) ? DF_DATA.format(dataLocal(d)!) : "—");
export const fmtDataCurta = (d: DataLike) => (dataLocal(d) ? DF_DATA_CURTA.format(dataLocal(d)!) : "—");
export const fmtDataHora = (d: DataLike) => (data(d) ? DF_DATA_HORA.format(data(d)!) : "—");
export const fmtHora = (d: DataLike) => (data(d) ? DF_HORA.format(data(d)!) : "—");

/** 2h 33m · 45m */
export function fmtDuracao(minutos: number) {
  const m = Math.max(0, Math.round(minutos));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}

export function minutosEntre(a: DataLike, b: DataLike = new Date()) {
  const da = data(a);
  const db = data(b);
  return da && db ? (db.getTime() - da.getTime()) / 60_000 : 0;
}

/** Dias até uma data (negativo = em atraso). */
export function diasAte(d: DataLike) {
  const alvo = dataLocal(d);
  if (!alvo) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

/** "agora", "há 3 min", "há 2 h", "há 3 dias" */
export function fmtRelativo(d: DataLike, agora: number = Date.now()) {
  const alvo = data(d);
  if (!alvo) return "—";
  const s = Math.max(0, (agora - alvo.getTime()) / 1000);
  if (s < 45) return "agora";
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86_400) return `há ${Math.floor(s / 3600)} h`;
  return `há ${Math.floor(s / 86_400)} dia${s >= 172_800 ? "s" : ""}`;
}

/** Cronómetro h:mm:ss */
export function fmtCronometro(segundos: number) {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Quantidade com a unidade do material (kg/m² com 1 casa decimal, ml/un inteiros). */
export function fmtQtd(v: number | string | null | undefined, unidade: string) {
  const n = num(v);
  if (!Number.isFinite(n)) return "—";
  const casas = unidade === "kg" || unidade === "m2" ? 1 : 0;
  return `${nf(casas, casas).format(n)} ${unidade === "m2" ? "m²" : unidade}`;
}

export function fmtEuro(v: number) {
  return `${nf(2, 2).format(v)} €`;
}
