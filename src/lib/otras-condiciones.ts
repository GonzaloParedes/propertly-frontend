import type { CommissionPayer, ContractTerms, LateFeeMethod } from "@/lib/backend-types";
import { armarGarantias, hayErrores, validarGarantias, type GarantiaBorrador } from "@/lib/garantias";

/**
 * «Otras condiciones» del alta de contrato: lo que el propietario puede dejar para después.
 * Todo es texto mientras se escribe; lo que queda vacío no se manda.
 */
export type PunitoriosBorrador = {
  method: LateFeeMethod | null;
  /** Porcentaje o monto según el método. */
  value: string;
  graceDays: string;
};

export type OtrasCondiciones = {
  /** Sólo dígitos. */
  deposito: string;
  /** Porcentaje, con coma o punto decimal. */
  comision: string;
  quienPagaComision: CommissionPayer | null;
  punitorios: PunitoriosBorrador;
  garantias: GarantiaBorrador[];
};

export const SIN_OTRAS_CONDICIONES: OtrasCondiciones = {
  deposito: "",
  comision: "",
  quienPagaComision: null,
  punitorios: { method: null, value: "", graceDays: "" },
  garantias: [],
};

export type GrupoDeCondiciones = "deposito" | "comision" | "punitorios" | "garantias";

export const GRUPOS: { grupo: GrupoDeCondiciones; titulo: string }[] = [
  { grupo: "deposito", titulo: "Depósito" },
  { grupo: "comision", titulo: "Comisión de la inmobiliaria" },
  { grupo: "punitorios", titulo: "Punitorios" },
  { grupo: "garantias", titulo: "Garantías" },
];

export const QUIEN_PAGA: { valor: CommissionPayer; etiqueta: string }[] = [
  { valor: "LANDLORD", etiqueta: "La paga el propietario" },
  { valor: "TENANT", etiqueta: "La paga el inquilino" },
  { valor: "SHARED", etiqueta: "Entre los dos" },
];

/** Cada método con el ejemplo de una cláusula típica y la unidad en que se escribe el valor. */
export const METODOS_DE_PUNITORIOS: { method: LateFeeMethod; titulo: string; ejemplo: string; unidad: "%" | "$"; sufijo: string }[] = [
  { method: "PERCENT_PER_DAY", titulo: "Un porcentaje por día de atraso", ejemplo: "0,5 % por día", unidad: "%", sufijo: "% por día" },
  { method: "PERCENT_PER_MONTH", titulo: "Un porcentaje mensual, proporcional a los días", ejemplo: "5 % mensual", unidad: "%", sufijo: "% mensual" },
  { method: "PERCENT_PER_YEAR", titulo: "Una tasa anual, proporcional a los días", ejemplo: "60 % anual", unidad: "%", sufijo: "% anual" },
  { method: "FIXED_PER_DAY", titulo: "Un monto fijo por día de atraso", ejemplo: "$ 5.000 por día", unidad: "$", sufijo: "por día" },
  { method: "FIXED_ONCE", titulo: "Una multa única", ejemplo: "$ 20.000 una sola vez", unidad: "$", sufijo: "una sola vez" },
];

export function definicionDeMetodo(method: LateFeeMethod) {
  return METODOS_DE_PUNITORIOS.find((m) => m.method === method)!;
}

/** «0,5» y «0.5» son lo mismo; cualquier otra cosa no es un número. */
export function numeroDecimal(texto: string): number {
  const limpio = texto.trim().replace(",", ".");
  return limpio === "" || !/^\d*\.?\d*$/.test(limpio) ? Number.NaN : Number(limpio);
}

/** Sólo dígitos y a lo sumo un separador decimal. */
export function soloDecimal(texto: string): string {
  const limpio = texto.replace(/[^\d.,]/g, "");
  const corte = limpio.search(/[.,]/);
  return corte === -1 ? limpio : limpio.slice(0, corte + 1) + limpio.slice(corte + 1).replace(/[.,]/g, "");
}

export function punitoriosCargados(p: PunitoriosBorrador): boolean {
  return p.method !== null;
}

export function hayOtrasCondiciones(o: OtrasCondiciones): boolean {
  return o.deposito !== "" || o.comision !== "" || punitoriosCargados(o.punitorios) || o.garantias.length > 0;
}

export type ErroresDeOtrasCondiciones = Partial<Record<"comision" | "punitorios" | "diasDeGracia", string>>;

export function validarOtrasCondiciones(o: OtrasCondiciones): ErroresDeOtrasCondiciones {
  const errores: ErroresDeOtrasCondiciones = {};
  if (o.comision !== "") {
    const comision = numeroDecimal(o.comision);
    if (Number.isNaN(comision) || comision > 100) errores.comision = "La comisión es un porcentaje entre 0 y 100.";
  }
  if (o.punitorios.method !== null) {
    const valor = numeroDecimal(o.punitorios.value);
    if (Number.isNaN(valor) || valor <= 0) errores.punitorios = "Indique cuánto se cobra por el atraso.";
  }
  return errores;
}

/** ¿Se puede seguir? Las garantías con datos incompletos también lo impiden. */
export function otrasCondicionesValidas(o: OtrasCondiciones): boolean {
  return Object.keys(validarOtrasCondiciones(o)).length === 0 && !hayErrores(validarGarantias(o.garantias));
}

/** Sólo lo que se cargó: un campo vacío no viaja, porque un cero o un `false` serían un dato que nadie dio. */
export function armarOtrasCondiciones(o: OtrasCondiciones): Partial<ContractTerms> {
  const terminos: Partial<ContractTerms> = {};
  if (o.deposito !== "") terminos.depositAmount = Number(o.deposito);
  if (o.comision !== "") {
    terminos.commissionPercent = numeroDecimal(o.comision);
    if (o.quienPagaComision !== null) terminos.commissionPayer = o.quienPagaComision;
  }
  if (o.punitorios.method !== null) {
    terminos.lateFeeMethod = o.punitorios.method;
    terminos.lateFeeValue = numeroDecimal(o.punitorios.value);
    if (o.punitorios.graceDays !== "") terminos.lateFeeGraceDays = Number(o.punitorios.graceDays);
  }
  if (o.garantias.length > 0) terminos.guarantees = armarGarantias(o.garantias);
  return terminos;
}

const PESOS = (n: number) => `$ ${n.toLocaleString("es-AR")}`;
const PORCENTAJE = (texto: string) => `${texto.trim().replace(".", ",")} %`;

export function describirPunitorios(p: PunitoriosBorrador): string {
  if (p.method === null) return "Sin cargar";
  const { unidad, sufijo } = definicionDeMetodo(p.method);
  const valor = numeroDecimal(p.value);
  const monto = Number.isNaN(valor) ? "—" : unidad === "$" ? `${PESOS(valor)} ${sufijo}` : `${PORCENTAJE(p.value)} ${sufijo.replace(/^% /, "")}`;
  const gracia = p.graceDays === "" ? "" : ` · ${p.graceDays} ${p.graceDays === "1" ? "día" : "días"} de gracia`;
  return `${monto}${gracia}`;
}

/** Una línea por grupo, para la lista del paso y para la revisión. */
export function resumenDeGrupo(o: OtrasCondiciones, grupo: GrupoDeCondiciones): string {
  switch (grupo) {
    case "deposito":
      return o.deposito === "" ? "Sin cargar" : PESOS(Number(o.deposito));
    case "comision": {
      if (o.comision === "") return "Sin cargar";
      const quien = QUIEN_PAGA.find((q) => q.valor === o.quienPagaComision)?.etiqueta.toLowerCase();
      return quien ? `${PORCENTAJE(o.comision)} · ${quien}` : PORCENTAJE(o.comision);
    }
    case "punitorios":
      return describirPunitorios(o.punitorios);
    case "garantias":
      return o.garantias.length === 0 ? "Sin cargar" : `${o.garantias.length} ${o.garantias.length === 1 ? "garantía" : "garantías"}`;
  }
}

export function resumenDeOtrasCondiciones(o: OtrasCondiciones): string {
  const cargados = GRUPOS.filter(({ grupo }) => resumenDeGrupo(o, grupo) !== "Sin cargar");
  return cargados.length === 0
    ? "Sin cargar"
    : cargados.map(({ grupo, titulo }) => `${titulo}: ${resumenDeGrupo(o, grupo)}`).join(" · ");
}
