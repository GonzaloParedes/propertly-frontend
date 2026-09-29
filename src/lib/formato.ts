import type { PropertyResponse } from "@/lib/backend-types";

export function formatearDireccion(property: PropertyResponse): string {
  const base = `${property.street} ${property.number}`.trim();
  return property.floorUnit ? `${base}, ${property.floorUnit}` : base;
}

export function formatearMonto(monto: number): string {
  return `$ ${monto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
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
