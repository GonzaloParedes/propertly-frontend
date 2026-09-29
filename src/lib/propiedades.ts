import { formatearDireccion, formatearMonto } from "@/lib/formato";
import { detallePropiedad } from "@/lib/propiedad";
import type { InvoiceResponse, PropertyResponse } from "@/lib/backend-types";

/**
 * El estado de una propiedad en la lista. No es un campo del backend: sale de
 * cruzar su contrato vigente con las cuotas de ese contrato.
 *
 * «Pago a confirmar» no es un estado de la propiedad ni de la cuota sino del
 * pago, y gana sobre «Vencida» por la misma razón que en Cobranzas: mientras
 * haya un comprobante esperando, lo que la pantalla tiene que decir es que falta
 * un click del propietario.
 */
export type EstadoPropiedad = "Al día" | "Vencida" | "Pago a confirmar" | "Sin alquilar";

export interface FilaPropiedad {
  id: number;
  direccion: string;
  ciudad: string;
  /** «Departamento · CABA · 58 m²». */
  detalle: string;
  /** El alquiler vigente, ya formateado. `null` sin contrato. */
  alquiler: string | null;
  contratoId: number | null;
  estado: EstadoPropiedad;
  /** Para las facetas, que cuentan sobre valores y no sobre texto. */
  dormitorios: number | null;
  mascotas: boolean;
  amoblada: boolean;
  /** Lo que la búsqueda por texto mira, ya normalizado. */
  busqueda: string;
}

/**
 * Cuántos meses hacia atrás se piden las cuotas para resolver el estado.
 *
 * El chip depende sólo de lo que todavía pide atención: una cuota vencida sin
 * pagar o un pago sin confirmar. Traer la historia entera para eso es lo que el
 * pedido al backend señalaba que no escala, y ahora `GET /invoices` se puede
 * acotar por período.
 *
 * Doce y no dos: con una ventana corta, una deuda vieja queda afuera y la
 * propiedad se mostraría «Al día» estando en mora. Doce cubre cualquier atraso
 * realista y sigue siendo un orden de magnitud menos que todo.
 */
export const MESES_DE_VENTANA = 12;

/** El `periodFrom` que le corresponde a esa ventana, como fecha ISO completa. */
export function desdeDeLaVentana(hoyISO: string): string {
  const [anio, mes] = hoyISO.split("-").map(Number);
  const desde = new Date(Date.UTC(anio, mes - 1 - MESES_DE_VENTANA, 1));
  return desde.toISOString().slice(0, 10);
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function estadoDePropiedad(
  property: PropertyResponse,
  cuotasDelContrato: InvoiceResponse[]
): EstadoPropiedad {
  if (!property.activeContract) return "Sin alquilar";
  if (cuotasDelContrato.some((i) => i.payments.some((p) => p.status === "AWAITING_CONFIRMATION"))) {
    return "Pago a confirmar";
  }
  if (cuotasDelContrato.some((i) => i.status === "DUE")) return "Vencida";
  return "Al día";
}

/**
 * Cruza las propiedades con las cuotas de la ventana. Las cuotas llegan de toda
 * la cartera en una sola llamada y se agrupan acá por contrato: es una pasada,
 * contra una llamada por propiedad.
 */
export function buildFilasPropiedad(
  properties: PropertyResponse[],
  invoices: InvoiceResponse[]
): FilaPropiedad[] {
  const porContrato = new Map<number, InvoiceResponse[]>();
  for (const invoice of invoices) {
    const lista = porContrato.get(invoice.contractId);
    if (lista) lista.push(invoice);
    else porContrato.set(invoice.contractId, [invoice]);
  }

  return properties.map((property) => {
    const contrato = property.activeContract ?? null;
    const direccion = formatearDireccion(property);
    return {
      id: property.id,
      direccion,
      ciudad: property.city,
      detalle: detallePropiedad(property),
      alquiler: contrato ? formatearMonto(contrato.currentRent) : null,
      contratoId: contrato?.id ?? null,
      estado: estadoDePropiedad(property, contrato ? porContrato.get(contrato.id) ?? [] : []),
      dormitorios: property.bedrooms ?? null,
      mascotas: property.petsAllowed === true,
      amoblada: property.furnished === true,
      busqueda: normalizar(
        [direccion, property.city, property.province, property.postalCode]
          .filter(Boolean)
          .join(" ")
      ),
    };
  });
}

/**
 * Contra un backend anterior a `codex/frontend-integration-lots` la clave
 * `activeContract` no viene, y todas las propiedades se verían «Sin alquilar»
 * —un dato falso, no uno faltante—. Se distingue de «ninguna está alquilada»
 * porque en ese caso el campo llega presente con valor `null`.
 */
export function backendNoInformaContratos(properties: PropertyResponse[]): boolean {
  return (
    properties.length > 0 && properties.every((p) => p.activeContract === undefined)
  );
}

export type FiltroEstado = "todas" | "conContrato" | "sinAlquilar";

export interface FiltroPropiedades {
  texto: string;
  ciudades: string[];
  dormitorios: string[];
  extras: string[];
  estado: FiltroEstado;
}

export const FILTRO_VACIO: FiltroPropiedades = {
  texto: "",
  ciudades: [],
  dormitorios: [],
  extras: [],
  estado: "todas",
};

const porTexto = (fila: FilaPropiedad, texto: string) =>
  texto.trim() === "" || fila.busqueda.includes(normalizar(texto.trim()));

const porCiudad = (fila: FilaPropiedad, ciudades: string[]) =>
  ciudades.length === 0 || ciudades.includes(fila.ciudad);

/** «4+» agrupa todo lo de cuatro para arriba; sin dormitorios cargados no entra. */
const porDormitorios = (fila: FilaPropiedad, dormitorios: string[]) =>
  dormitorios.length === 0 ||
  (fila.dormitorios !== null &&
    dormitorios.some((d) => (d === "4+" ? fila.dormitorios! >= 4 : fila.dormitorios === Number(d))));

/** Los extras se acumulan: elegir los dos pide las dos condiciones. */
const porExtras = (fila: FilaPropiedad, extras: string[]) =>
  extras.every((extra) =>
    extra === "mascotas" ? fila.mascotas : extra === "amoblada" ? fila.amoblada : true
  );

const porEstado = (fila: FilaPropiedad, estado: FiltroEstado) =>
  estado === "todas"
    ? true
    : estado === "sinAlquilar"
      ? fila.contratoId === null
      : fila.contratoId !== null;

export function filtrarPropiedades(
  filas: FilaPropiedad[],
  filtro: FiltroPropiedades
): FilaPropiedad[] {
  return filas.filter(
    (fila) =>
      porTexto(fila, filtro.texto) &&
      porCiudad(fila, filtro.ciudades) &&
      porDormitorios(fila, filtro.dormitorios) &&
      porExtras(fila, filtro.extras) &&
      porEstado(fila, filtro.estado)
  );
}

/**
 * Los contadores de la faceta de estado. Se cuentan sobre el resto de los
 * filtros ya aplicados y no sobre el total: si no, el número promete resultados
 * que la combinación elegida no va a dar.
 */
export function contarFacetas(
  filas: FilaPropiedad[],
  filtro: FiltroPropiedades
): Record<FiltroEstado, number> {
  const base = filas.filter(
    (fila) =>
      porTexto(fila, filtro.texto) &&
      porCiudad(fila, filtro.ciudades) &&
      porDormitorios(fila, filtro.dormitorios) &&
      porExtras(fila, filtro.extras)
  );
  return {
    todas: base.length,
    conContrato: base.filter((fila) => fila.contratoId !== null).length,
    sinAlquilar: base.filter((fila) => fila.contratoId === null).length,
  };
}

/** Las ciudades que hay para ofrecer, sin repetir y en orden. */
export function ciudadesDisponibles(filas: FilaPropiedad[]): string[] {
  return [...new Set(filas.map((fila) => fila.ciudad))].sort((a, b) => a.localeCompare(b, "es"));
}

/** La bajada del encabezado: dice lo que hay, sin afirmar un total fijo. */
export function resumenPropiedades(filas: FilaPropiedad[]): string {
  if (filas.length === 0) return "Todavía no cargó ninguna propiedad.";
  const conContrato = filas.filter((fila) => fila.contratoId !== null).length;
  const base = `${filas.length} ${filas.length === 1 ? "propiedad" : "propiedades"}`;
  return conContrato === 0
    ? `${base} · ninguna alquilada`
    : `${base} · ${conContrato} con contrato activo`;
}
