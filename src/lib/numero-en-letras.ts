import type { Currency } from "@/lib/backend-types";

const UNIDADES = [
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
  "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete",
  "veintiocho", "veintinueve",
];
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos",
];

/** Del 1 al 99. Con `apocope`, el uno final se dice «un» (veintiún, treinta y un): va antes de «mil» o «millón». */
function hastaNoventaYNueve(n: number, apocope: boolean): string {
  if (n < 30) {
    if (apocope && n === 1) return "un";
    if (apocope && n === 21) return "veintiún";
    return UNIDADES[n];
  }
  const decena = DECENAS[Math.floor(n / 10)];
  const unidad = n % 10;
  if (unidad === 0) return decena;
  return `${decena} y ${apocope && unidad === 1 ? "un" : UNIDADES[unidad]}`;
}

/** Del 1 al 999. */
function hastaNovecientosNoventaYNueve(n: number, apocope: boolean): string {
  if (n === 100) return "cien";
  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes = [centena > 0 ? CENTENAS[centena] : "", resto > 0 ? hastaNoventaYNueve(resto, apocope) : ""];
  return partes.filter(Boolean).join(" ");
}

/** Del 1 al 999.999. */
function hastaNovecientosMil(n: number, apocope: boolean): string {
  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (miles === 1) partes.push("mil");
  else if (miles > 1) partes.push(`${hastaNovecientosNoventaYNueve(miles, true)} mil`);
  if (resto > 0) partes.push(hastaNovecientosNoventaYNueve(resto, apocope));
  return partes.join(" ");
}

/**
 * Un entero no negativo, menor a un billón, en palabras: «cuatrocientos cincuenta mil»,
 * «un millón», «veintiún mil». Sin la moneda: el «uno» final no se apocopa.
 */
export function enteroEnLetras(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1e12) throw new RangeError(`Número fuera de rango: ${n}`);
  if (n === 0) return "cero";
  const millones = Math.floor(n / 1e6);
  const resto = n % 1e6;
  const partes: string[] = [];
  if (millones === 1) partes.push("un millón");
  else if (millones > 1) partes.push(`${hastaNovecientosMil(millones, true)} millones`);
  if (resto > 0) partes.push(hastaNovecientosMil(resto, false));
  return partes.join(" ");
}

const NOMBRE_DE_MONEDA: Record<Currency, string> = {
  ARS: "pesos",
  USD: "dólares estadounidenses",
};

/**
 * La leyenda de un importe: «Son pesos cuatrocientos cincuenta mil con 00/100».
 * Los centavos se redondean a dos decimales y van como fracción sobre cien.
 * `moneda` ausente es pesos, como en `formatearMonto`.
 */
export function montoEnLetras(monto: number, moneda: Currency = "ARS"): string {
  const centavosTotales = Math.round(Math.abs(monto) * 100);
  const enteros = Math.floor(centavosTotales / 100);
  const centavos = String(centavosTotales % 100).padStart(2, "0");
  return `Son ${NOMBRE_DE_MONEDA[moneda]} ${enteroEnLetras(enteros)} con ${centavos}/100`;
}
