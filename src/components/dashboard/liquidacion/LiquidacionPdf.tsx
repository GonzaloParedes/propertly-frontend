import { Circle, Document, Font, G, Page, Path, StyleSheet, Svg, Text, View, pdf } from "@react-pdf/renderer";
import type { Liquidacion } from "@/lib/liquidacion";

/**
 * El PDF de liquidación de un pago (ALQ-140). Este módulo trae `@react-pdf/renderer`,
 * que pesa: el resto de la app lo importa SÓLO con `import()` dinámico, al hacer
 * click en «Liquidación», para que el panel no cargue el renderer.
 */

// Colores del manual de marca v1.1 (docs/brand/color/alquia-colores.json).
const INDIGO = "#5B4BC4";
const ROSA = "#DB4C8E";
const TINTA = "#1E1B2E";
const GRIS = "#514D63";
const PANEL = "#F6F5FC";
const LINEA = "#EDEBF7";
const AMBAR = "#B26A00";
const AMBAR_FONDO = "#F8EFDB";

const QUICKSAND = "Quicksand";
const NUNITO = "Nunito Sans";

const ARCHIVOS_DE_FUENTE = [
  { family: QUICKSAND, fontWeight: 600, archivo: "quicksand-latin-600-normal.woff" },
  { family: QUICKSAND, fontWeight: 700, archivo: "quicksand-latin-700-normal.woff" },
  { family: NUNITO, fontWeight: 400, archivo: "nunito-sans-latin-400-normal.woff" },
  { family: NUNITO, fontWeight: 600, archivo: "nunito-sans-latin-600-normal.woff" },
  { family: NUNITO, fontWeight: 700, archivo: "nunito-sans-latin-700-normal.woff" },
] as const;

/**
 * Registra las tipografías de marca. `ubicacion` dice dónde está cada archivo: en el
 * navegador, el asset que copia `scripts/copy-pdf-fonts.mjs`; en un script de Node
 * (para revisar el PDF a ojo), la ruta dentro de `node_modules`.
 */
export function registrarFuentes(
  ubicacion: (archivo: string) => string = (archivo) => `${window.location.origin}/vendor/fonts/${archivo}`
): void {
  for (const { family, fontWeight, archivo } of ARCHIVOS_DE_FUENTE) {
    Font.register({ family, fonts: [{ src: ubicacion(archivo), fontWeight }] });
  }
  // Sin guiones: una dirección o un nombre no se parte en mitad de palabra.
  Font.registerHyphenationCallback((palabra) => [palabra]);
}

const s = StyleSheet.create({
  pagina: { paddingTop: 44, paddingBottom: 56, paddingHorizontal: 44, fontFamily: NUNITO, fontSize: 10, color: TINTA },
  encabezado: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  emitidoPor: { marginTop: 6, fontSize: 9, color: GRIS },
  titulo: { fontFamily: QUICKSAND, fontWeight: 700, fontSize: 20, color: INDIGO, textAlign: "right" },
  numero: { marginTop: 4, fontWeight: 700, fontSize: 11, textAlign: "right" },
  emision: { marginTop: 2, fontSize: 9, color: GRIS, textAlign: "right" },
  regla: { marginTop: 14, height: 2, backgroundColor: INDIGO },
  reglaRosa: { width: 36, height: 2, backgroundColor: ROSA },
  columnas: { flexDirection: "row", marginTop: 18, gap: 16 },
  columna: { flex: 1 },
  etiqueta: { fontWeight: 700, fontSize: 7.5, letterSpacing: 0.8, color: GRIS, textTransform: "uppercase", marginBottom: 4 },
  valor: { fontWeight: 700, fontSize: 11 },
  secundario: { marginTop: 2, fontSize: 9, color: GRIS },
  panel: { marginTop: 18, flexDirection: "row", gap: 16, backgroundColor: PANEL, borderRadius: 8, padding: 14 },
  tabla: { marginTop: 20 },
  tablaCabecera: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: INDIGO },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: LINEA },
  filaTexto: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  etiquetaExtra: { fontWeight: 700, fontSize: 6.5, letterSpacing: 0.6, color: AMBAR, backgroundColor: AMBAR_FONDO, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2 },
  monto: { fontWeight: 600, fontSize: 10.5, textAlign: "right" },
  total: { marginTop: 22, backgroundColor: INDIGO, borderRadius: 10, paddingVertical: 18, paddingHorizontal: 22 },
  totalEtiqueta: { fontWeight: 700, fontSize: 8, letterSpacing: 1.2, color: "#FFFFFF" },
  totalLetras: { marginTop: 4, fontSize: 9, color: "#E4E0FA" },
  totalMonto: { marginTop: 8, fontFamily: QUICKSAND, fontWeight: 700, fontSize: 30, color: "#FFFFFF" },
  pago: { marginTop: 18, flexDirection: "row", gap: 16 },
  pie: { position: "absolute", left: 44, right: 44, bottom: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: GRIS },
});

/** El logo de `public/logos/lockup.svg`, con la misma geometría y los mismos colores. */
function Logo({ ancho = 108 }: Readonly<{ ancho?: number }>) {
  return (
    <Svg viewBox="0 0 360 160" width={ancho} height={(ancho * 160) / 360}>
      <G fill="none" stroke={TINTA} strokeWidth={15} strokeLinecap="round">
        <Circle cx={45} cy={90} r={22.5} />
        <Path d="M67.5 67.5 V112.5" />
        <Path d="M94.5 32.5 V112.5" />
        <Circle cx={144} cy={90} r={22.5} />
        <Path d="M166.5 67.5 V137.5" />
        <Path d="M193.5 67.5 V90 A22.5 22.5 0 0 0 238.5 90 V67.5" />
        <Path d="M265.5 67.5 V112.5" />
        <Circle cx={315} cy={90} r={22.5} />
        <Path d="M337.5 67.5 V112.5" />
      </G>
      <G transform="translate(244.5,16) scale(1.4)" fill="none">
        <Path d="M4 13 L15 3.5 L26 13" stroke={ROSA} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={15} cy={22.5} r={5.5} fill={INDIGO} />
      </G>
    </Svg>
  );
}

function Dato({ etiqueta, valor, secundario, ancho }: Readonly<{ etiqueta: string; valor: string; secundario?: string; ancho?: number }>) {
  return (
    <View style={ancho ? { flex: ancho } : s.columna}>
      <Text style={s.etiqueta}>{etiqueta}</Text>
      <Text style={s.valor}>{valor}</Text>
      {secundario ? <Text style={s.secundario}>{secundario}</Text> : null}
    </View>
  );
}

const conCuit = (p: Liquidacion["emisor"]) => (p.taxId ? `CUIT ${p.taxId}` : undefined);

export function LiquidacionPdf({ modelo }: Readonly<{ modelo: Liquidacion }>) {
  const { emisor, inquilino, conceptos } = modelo;
  return (
    <Document title={`Liquidación de pago ${modelo.numero}`} author="Alquia" creator="Alquia" producer="Alquia">
      <Page size="A4" style={s.pagina}>
        <View style={s.encabezado}>
          <View>
            <Logo />
            <Text style={s.emitidoPor}>Emitido por {emisor.nombre}{emisor.taxId ? ` · CUIT ${emisor.taxId}` : ""}</Text>
          </View>
          <View>
            <Text style={s.titulo}>Liquidación de pago</Text>
            <Text style={s.numero}>{modelo.numero}</Text>
            <Text style={s.emision}>Emitida el {modelo.fechaEmision}</Text>
          </View>
        </View>

        <View style={s.regla}><View style={s.reglaRosa} /></View>

        <View style={s.columnas}>
          <Dato etiqueta="Propietario" valor={emisor.nombre} secundario={conCuit(emisor)} />
          <Dato etiqueta="Inquilino" valor={inquilino.nombre} secundario={conCuit(inquilino)} />
          <Dato etiqueta="Cuota" valor={`Cuota ${modelo.cuota.numero} de ${modelo.cuota.total}`} secundario={modelo.periodo} />
        </View>

        <View style={s.panel}>
          <Dato etiqueta="Inmueble" valor={modelo.direccion} ancho={3} />
          <Dato etiqueta="Contrato vigente" valor={`${modelo.vigencia.desde} – ${modelo.vigencia.hasta}`} ancho={2} />
        </View>

        {conceptos ? (
          <View style={s.tabla}>
            <View style={s.tablaCabecera}>
              <Text style={s.etiqueta}>Concepto</Text>
              <Text style={s.etiqueta}>Importe</Text>
            </View>
            {conceptos.map((c) => (
              <View key={`${c.descripcion}-${c.monto}`} style={s.fila} wrap={false}>
                <View style={s.filaTexto}>
                  <View>
                    <Text style={{ fontWeight: 600 }}>{c.descripcion}</Text>
                    {c.detalle ? <Text style={s.secundario}>{c.detalle}</Text> : null}
                  </View>
                  {c.extra ? <Text style={s.etiquetaExtra}>EXTRA</Text> : null}
                </View>
                <Text style={s.monto}>{c.monto}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={s.total}>
          <Text style={s.totalEtiqueta}>MONTO PAGADO</Text>
          <Text style={s.totalLetras}>{modelo.montoEnLetras}</Text>
          <Text style={s.totalMonto}>{modelo.montoPagado}</Text>
        </View>

        <View style={s.pago}>
          {modelo.fechaPago ? <Dato etiqueta="Fecha de pago" valor={modelo.fechaPago} /> : null}
          {modelo.comprobante ? <Dato etiqueta="Comprobante" valor={modelo.comprobante} /> : null}
        </View>

        <View style={s.pie} fixed>
          <Text>Documento no válido como factura. Generado con Alquia.</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/** Genera el PDF en el navegador y lo baja con el nombre del modelo. */
export async function descargarLiquidacion(modelo: Liquidacion): Promise<void> {
  registrarFuentes();
  const blob = await pdf(<LiquidacionPdf modelo={modelo} />).toBlob();
  const url = URL.createObjectURL(blob);
  try {
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = modelo.nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}
