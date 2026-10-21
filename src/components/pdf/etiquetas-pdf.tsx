import { Document, Image, Page, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { fmtDataHora, fmtDimensoes, fmtKg, fmtM2 } from "@/lib/formato";

// 1 mm em pontos PDF.
const MM = 72 / 25.4;

export type FormatoEtiqueta = "A4_4por_pagina" | "A6_individual" | "rolo";

export interface DadosEtiqueta {
  codigo: string;
  numeroOf: string;
  codigoObra: string;
  nomeObra: string;
  cliente: string;
  zona: string | null;
  piso: number | null;
  coluna: string | null;
  largura: string;
  altura: string;
  m2: string;
  peso: string | null;
  material: string | null;
  qrPng: string; // data URL
  barcodePng?: string; // data URL (Code 128)
}

/** Dimensões e tipografia por variante. A6 = 148 × 105 mm; rolo = 100 × 70 mm. */
const VARIANTES = {
  normal: { w: 148 * MM, h: 105 * MM, pad: 5 * MM, qr: 42 * MM, codigo: 17, valor: 8.5, rotulo: 5.6, cab: 8, barH: 11 * MM, grande: 13 },
  compacta: { w: 100 * MM, h: 70 * MM, pad: 3.5 * MM, qr: 25 * MM, codigo: 12, valor: 6.6, rotulo: 4.6, cab: 6.4, barH: 7.5 * MM, grande: 9.5 },
} as const;
type Variante = keyof typeof VARIANTES;

const s = StyleSheet.create({
  pagina: { backgroundColor: "#ffffff", fontFamily: "Helvetica", color: "#000000" },
  linha: { flexDirection: "row" },
});

function LogoPdf({ tamanho }: { tamanho: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 32 32">
      <Rect x={0} y={0} width={32} height={32} rx={7} fill="#000000" />
      <Rect x={7} y={9} width={7} height={16} rx={1} fill="#ffffff" />
      <Rect x={18} y={5} width={7} height={20} rx={1} fill="#ffffff" />
    </Svg>
  );
}

function Campo({ rotulo, valor, v, flex = 1, grande = false }: { rotulo: string; valor: string; v: (typeof VARIANTES)[Variante]; flex?: number; grande?: boolean }) {
  return (
    <View style={{ flex, paddingRight: 4 }}>
      <Text style={{ fontSize: v.rotulo, fontFamily: "Helvetica-Bold", color: "#555555", letterSpacing: 0.4, marginBottom: 1 }}>{rotulo}</Text>
      <Text style={{ fontSize: grande ? v.grande : v.valor, fontFamily: grande ? "Helvetica-Bold" : "Helvetica", maxLines: 1, textOverflow: "ellipsis" }}>
        {valor}
      </Text>
    </View>
  );
}

/** Uma etiqueta com dimensões físicas fixas — usada em todos os formatos. */
export function Etiqueta({ d, variante = "normal", contorno = false }: { d: DadosEtiqueta; variante?: Variante; contorno?: boolean }) {
  const v = VARIANTES[variante];
  const pesoTxt = d.peso ? `~${fmtKg(d.peso)}` : "—";
  const gap = variante === "normal" ? 5 : 3.5;

  return (
    <View
      style={{
        width: v.w,
        height: v.h,
        padding: v.pad,
        flexDirection: "column",
        ...(contorno && { borderWidth: 0.5, borderColor: "#bbbbbb", borderStyle: "dashed" }),
      }}
    >
      {/* Cabeçalho */}
      <View style={{ ...s.linha, alignItems: "center", justifyContent: "space-between", paddingBottom: 3, borderBottomWidth: 1.2, borderBottomColor: "#000000" }}>
        <View style={{ ...s.linha, alignItems: "center" }}>
          <LogoPdf tamanho={v.cab * 1.9} />
          <Text style={{ fontSize: v.cab, fontFamily: "Helvetica-Bold", marginLeft: 4 }}>GS ERP Industrial</Text>
        </View>
        <Text style={{ fontSize: v.cab * 1.15, fontFamily: "Helvetica-Bold", letterSpacing: 1.6 }}>TORRE DUPLA</Text>
      </View>

      {/* Código */}
      <Text style={{ fontSize: v.codigo, fontFamily: "Helvetica-Bold", letterSpacing: 0.6, marginTop: gap, marginBottom: gap }}>{d.codigo}</Text>

      {/* QR + dados */}
      <View style={{ ...s.linha, flexGrow: 1 }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf não suporta alt */}
        <Image src={d.qrPng} style={{ width: v.qr, height: v.qr }} />
        <View style={{ flex: 1, marginLeft: gap * 1.4, justifyContent: "space-between", height: v.qr }}>
          <View style={s.linha}>
            <Campo rotulo="OF" valor={d.numeroOf} v={v} />
            <Campo rotulo="OBRA" valor={d.codigoObra} v={v} />
          </View>
          <View style={s.linha}>
            <Campo rotulo="CLIENTE" valor={d.cliente} v={v} />
          </View>
          <View style={s.linha}>
            <Campo rotulo="ZONA" valor={d.zona ?? "—"} v={v} flex={2.2} grande />
            <Campo rotulo="PISO" valor={d.piso != null ? String(d.piso) : "—"} v={v} flex={0.8} grande />
            <Campo rotulo="COL." valor={d.coluna ?? "—"} v={v} flex={0.8} grande />
          </View>
          <View style={s.linha}>
            <Campo rotulo="DIMENSÕES" valor={fmtDimensoes(d.largura, d.altura)} v={v} />
            <Campo rotulo="ÁREA" valor={fmtM2(d.m2)} v={v} flex={0.6} />
            <Campo rotulo="PESO" valor={pesoTxt} v={v} flex={0.6} />
          </View>
          <View style={s.linha}>
            <Campo rotulo="MATERIAL" valor={d.material ?? "—"} v={v} />
          </View>
        </View>
      </View>

      {/* Obra + data de impressão */}
      <View style={{ ...s.linha, justifyContent: "space-between", alignItems: "flex-end", marginTop: gap }}>
        <Text style={{ fontSize: v.rotulo + 1, color: "#333333", flex: 1, maxLines: 1, textOverflow: "ellipsis" }}>{d.nomeObra}</Text>
        <Text style={{ fontSize: v.rotulo + 0.4, color: "#777777", marginLeft: 6 }}>Impresso {fmtDataHora(new Date())}</Text>
      </View>

      {/* Código de barras */}
      {d.barcodePng && (
        <View style={{ marginTop: gap, paddingTop: gap, borderTopWidth: 0.8, borderTopColor: "#000000", alignItems: "center" }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf não suporta alt */}
          <Image src={d.barcodePng} style={{ height: v.barH, width: v.w - 2 * v.pad - 10 * MM, objectFit: "fill" }} />
          <Text style={{ fontSize: v.valor, fontFamily: "Courier-Bold", marginTop: 2, letterSpacing: 1.5 }}>{d.codigo}</Text>
        </View>
      )}
    </View>
  );
}

export function EtiquetasDocumento({ etiquetas, formato }: { etiquetas: DadosEtiqueta[]; formato: FormatoEtiqueta }) {
  const titulo = etiquetas.length === 1 ? `Etiqueta ${etiquetas[0].codigo}` : `Etiquetas (${etiquetas.length})`;
  const meta = { title: titulo, author: "GS ERP Industrial", creator: "GS ERP Industrial — Torre Dupla", producer: "GS ERP Industrial" };

  if (formato === "A4_4por_pagina") {
    // A4 horizontal (297 × 210 mm) = 2 × 2 etiquetas A6 com linhas de corte.
    const paginas: DadosEtiqueta[][] = [];
    for (let i = 0; i < etiquetas.length; i += 4) paginas.push(etiquetas.slice(i, i + 4));
    return (
      <Document {...meta}>
        {paginas.map((grupo, p) => (
          <Page key={p} size="A4" orientation="landscape" style={{ ...s.pagina, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignContent: "center" }}>
            {grupo.map((d) => (
              <Etiqueta key={d.codigo} d={d} contorno />
            ))}
          </Page>
        ))}
      </Document>
    );
  }

  const variante: Variante = formato === "rolo" ? "compacta" : "normal";
  const tamanho: [number, number] = [VARIANTES[variante].w, VARIANTES[variante].h];
  return (
    <Document {...meta}>
      {etiquetas.map((d) => (
        <Page key={d.codigo} size={tamanho} style={s.pagina}>
          <Etiqueta d={d} variante={variante} />
        </Page>
      ))}
    </Document>
  );
}
