import type { Currency, PropertyResponse } from "@/lib/backend-types";

export function formatearDireccion(property: PropertyResponse): string {
  const base = `${property.street} ${property.number}`.trim();
  return property.floorUnit ? `${base}, ${property.floorUnit}` : base;
}

/**
 * Un monto en la moneda de su contrato: `US$` para dólares y `$` para pesos,
 * sin convertir. `moneda` ausente significa pesos (el backend no la exige y las
 * cuotas heredan la del contrato). Todo monto de un contrato pasa por acá con
 * su moneda: omitirla en un contrato en dólares es el bug ALQ-187.
 */
export function formatearMonto(monto: number, moneda?: Currency): string {
  return `${simboloDe(moneda)} ${monto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Alias histórico de `formatearMonto` con la moneda explícita. */
export function formatearImporte(monto: number, moneda: Currency | undefined): string {
  return formatearMonto(monto, moneda);
}

/** «$» o «US$». */
export function simboloDe(moneda: Currency | undefined): string {
  return moneda === "USD" ? "US$" : "$";
}

/** Montos agrupados por moneda: nunca se suman pesos con dólares. */
export type TotalesPorMoneda = Partial<Record<Currency, number>>;

/** Suma `monto` al total de su moneda, en el lugar. */
export function sumarEnMoneda(totales: TotalesPorMoneda, monto: number, moneda: Currency | undefined): void {
  const clave = moneda ?? "ARS";
  totales[clave] = (totales[clave] ?? 0) + monto;
}

/**
 * «$ 450.000 · US$ 1.200». Pesos primero; una moneda en cero no se muestra, salvo
 * que todas lo estén (entonces «$ 0», como antes de separar por moneda).
 */
export function formatearTotales(totales: TotalesPorMoneda): string {
  const partes = (["ARS", "USD"] as const)
    .filter((moneda) => (totales[moneda] ?? 0) !== 0)
    .map((moneda) => formatearMonto(totales[moneda] ?? 0, moneda));
  return partes.length > 0 ? partes.join(" · ") : formatearMonto(0);
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

/** Días de calendario de `desdeISO` a `hastaISO`: positivo si `hastaISO` es posterior. Ignora la hora si la hay. */
export function diferenciaEnDias(desdeISO: string, hastaISO: string): number {
  const dia = (iso: string) => {
    const [anio, mes, d] = iso.slice(0, 10).split("-").map(Number);
    return Date.UTC(anio, mes - 1, d);
  };
  return Math.round((dia(hastaISO) - dia(desdeISO)) / 86_400_000);
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
