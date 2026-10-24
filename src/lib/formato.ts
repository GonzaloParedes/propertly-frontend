import type { Currency, PropertyResponse } from "@/lib/backend-types";

export function formatearDireccion(property: PropertyResponse): string {
  const base = `${property.street} ${property.number}`.trim();
  return property.floorUnit ? `${base}, ${property.floorUnit}` : base;
}

export function formatearMonto(monto: number): string {
  return `$ ${monto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/**
 * Como `formatearMonto`, pero respeta la moneda: `US$` para dólares y `$` para
 * pesos. `moneda` ausente significa pesos (las cuotas heredan la del contrato y
 * el backend no la exige). Lo usan el detalle de contrato, la importación de PDF
 * y la predicción de alquiler.
 */
export function formatearImporte(monto: number, moneda: Currency | undefined): string {
  const simbolo = moneda === "USD" ? "US$" : "$";
  return `${simbolo} ${monto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * Las fechas del backend son `LocalDate` («2026-08-01»), sin hora ni zona. Se
 * parten a mano en vez de pasarlas por `new Date()`: ese constructor las lee
 * como UTC y las imprime en la zona del navegador, que en Argentina las corre
 * un día para atrás.
 */
function partes(fechaISO: string): [number, number, number] | null {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  return anio && mes && dia ? [anio, mes, dia] : null;
}

export function formatearFecha(fechaISO: string): string {
  const p = partes(fechaISO);
  return p ? `${String(p[2]).padStart(2, "0")}/${String(p[1]).padStart(2, "0")}/${p[0]}` : fechaISO;
}

/** El período de una cuota, como se nombra en pantalla: «agosto 2026». */
export function formatearPeriodo(fechaISO: string): string {
  const p = partes(fechaISO);
  return p ? `${MESES[p[1] - 1]} ${p[0]}` : fechaISO;
}

/** «16/10»: para fechas cercanas, donde el año sobra. */
export function formatearDiaMes(fechaISO: string): string {
  const p = partes(fechaISO);
  return p ? `${String(p[2]).padStart(2, "0")}/${String(p[1]).padStart(2, "0")}` : fechaISO;
}

/**
 * El día de hoy en Argentina, como `LocalDate`. El backend cambia de día a la
 * medianoche argentina, así que `new Date().toISOString()` (UTC) se adelanta un
 * día desde las 21:00 y no sirve para decidir si una cuota ya venció.
 */
export function hoyEnArgentina(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(ahora);
}
