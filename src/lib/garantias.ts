import type { GuaranteeRequest, GuaranteeResponse, GuaranteeType } from "@/lib/backend-types";
import { correoValido } from "@/lib/correo";
import { cuitValido, formatearCuit, soloDigitos } from "@/lib/cuit";
import { errorDeTelefono, soloDigitosTelefono, telefonoValido } from "@/lib/telefono";

export const MAX_GARANTIAS = 3;

export type CampoGarantia =
  | "fullName"
  | "taxId"
  | "phoneNumber"
  | "email"
  | "address"
  | "employer"
  | "propertyAddress"
  | "propertyRegistry"
  | "insurerName"
  | "policyNumber";

/**
 * Lo que el propietario está cargando: el tipo y un texto por campo, aunque no se use. El `id` sólo
 * identifica la fila en pantalla (para que no se mezcle al borrar o reordenar): nunca viaja.
 */
export type GarantiaBorrador = { id: string; type: GuaranteeType } & Record<CampoGarantia, string>;

export const TIPOS_DE_GARANTIA: { type: GuaranteeType; titulo: string; ayuda: string }[] = [
  { type: "PERSONAL", titulo: "Un garante con recibo de sueldo", ayuda: "Una persona que responde con su sueldo." },
  { type: "PROPERTY", titulo: "Un garante con propiedad (garantía propietaria)", ayuda: "Una persona que responde con un inmueble." },
  { type: "SURETY_INSURANCE", titulo: "Un seguro de caución", ayuda: "Una póliza de una aseguradora." },
];

export interface DefinicionDeCampo {
  campo: CampoGarantia;
  etiqueta: string;
  ejemplo: string;
}

/** Cada tipo usa sólo sus campos, con los obligatorios primero. El backend rechaza los demás. */
export const CAMPOS_POR_TIPO: Record<GuaranteeType, { obligatorios: DefinicionDeCampo[]; opcionales: DefinicionDeCampo[] }> = {
  PERSONAL: {
    obligatorios: [{ campo: "fullName", etiqueta: "Nombre y apellido", ejemplo: "Ej: Ana Gómez" }],
    opcionales: [
      { campo: "taxId", etiqueta: "CUIT o CUIL", ejemplo: "Ej: 27-12345678-3" },
      { campo: "phoneNumber", etiqueta: "Teléfono", ejemplo: "Ej: 11 4455-2210" },
      { campo: "email", etiqueta: "Correo", ejemplo: "Ej: ana@ejemplo.com" },
      { campo: "address", etiqueta: "Domicilio", ejemplo: "Ej: Lavalle 950, Morón" },
      { campo: "employer", etiqueta: "Empleador", ejemplo: "Ej: Panadería Los Andes" },
    ],
  },
  PROPERTY: {
    obligatorios: [
      { campo: "fullName", etiqueta: "Nombre y apellido", ejemplo: "Ej: Ana Gómez" },
      { campo: "propertyAddress", etiqueta: "Dirección de la propiedad en garantía", ejemplo: "Ej: Av. Rivadavia 1234" },
    ],
    opcionales: [
      { campo: "propertyRegistry", etiqueta: "Matrícula", ejemplo: "Ej: 15-1234" },
      { campo: "taxId", etiqueta: "CUIT o CUIL", ejemplo: "Ej: 27-12345678-3" },
      { campo: "phoneNumber", etiqueta: "Teléfono", ejemplo: "Ej: 11 4455-2210" },
      { campo: "email", etiqueta: "Correo", ejemplo: "Ej: ana@ejemplo.com" },
      { campo: "address", etiqueta: "Domicilio del garante", ejemplo: "Ej: Lavalle 950, Morón" },
    ],
  },
  SURETY_INSURANCE: {
    obligatorios: [{ campo: "insurerName", etiqueta: "Aseguradora", ejemplo: "Ej: Aseguradora Sur" }],
    opcionales: [{ campo: "policyNumber", etiqueta: "Número de póliza", ejemplo: "Ej: 4411" }],
  },
};

const TODOS_LOS_CAMPOS: CampoGarantia[] = [
  "fullName", "taxId", "phoneNumber", "email", "address", "employer",
  "propertyAddress", "propertyRegistry", "insurerName", "policyNumber",
];

export function camposDe(tipo: GuaranteeType): CampoGarantia[] {
  const { obligatorios, opcionales } = CAMPOS_POR_TIPO[tipo];
  return [...obligatorios, ...opcionales].map((definicion) => definicion.campo);
}

let ultimoId = 0;

export function garantiaVacia(tipo: GuaranteeType): GarantiaBorrador {
  const base = Object.fromEntries(TODOS_LOS_CAMPOS.map((campo) => [campo, ""])) as Record<CampoGarantia, string>;
  ultimoId += 1;
  return { id: `garantia-${ultimoId}`, type: tipo, ...base };
}

export function nombreDelTipo(tipo: GuaranteeType): string {
  return TIPOS_DE_GARANTIA.find((t) => t.type === tipo)?.titulo ?? tipo;
}

/** Los campos de este tipo con algo escrito. */
export function camposCargados(garantia: GarantiaBorrador): CampoGarantia[] {
  return camposDe(garantia.type).filter((campo) => garantia[campo].trim() !== "");
}

/**
 * Cambiar de tipo conserva lo que los dos tipos comparten y descarta el resto.
 * `perdidos` son los campos con datos que no sobreviven, para avisar antes.
 */
export function cambiarTipo(garantia: GarantiaBorrador, nuevoTipo: GuaranteeType): { garantia: GarantiaBorrador; perdidos: CampoGarantia[] } {
  // Es la misma fila con otro tipo: conserva el id.
  const siguiente = { ...garantiaVacia(nuevoTipo), id: garantia.id };
  const quedan = new Set(camposDe(nuevoTipo));
  const perdidos: CampoGarantia[] = [];
  for (const campo of camposCargados(garantia)) {
    if (quedan.has(campo)) siguiente[campo] = garantia[campo];
    else perdidos.push(campo);
  }
  return { garantia: siguiente, perdidos };
}

export function etiquetaDeCampo(tipo: GuaranteeType, campo: CampoGarantia): string {
  const { obligatorios, opcionales } = CAMPOS_POR_TIPO[tipo];
  return [...obligatorios, ...opcionales].find((definicion) => definicion.campo === campo)?.etiqueta ?? campo;
}

const OBLIGATORIO: Partial<Record<CampoGarantia, string>> = {
  fullName: "Ingrese el nombre del garante.",
  propertyAddress: "Ingrese la dirección de la propiedad.",
  insurerName: "Ingrese la aseguradora.",
};

export type ErroresDeGarantia = Partial<Record<CampoGarantia, string>>;

export function validarGarantia(garantia: GarantiaBorrador): ErroresDeGarantia {
  const errores: ErroresDeGarantia = {};
  for (const { campo } of CAMPOS_POR_TIPO[garantia.type].obligatorios) {
    if (garantia[campo].trim() === "") errores[campo] = OBLIGATORIO[campo] ?? "Complete este dato.";
  }
  if (garantia.taxId.trim() !== "" && !cuitValido(garantia.taxId)) {
    errores.taxId = soloDigitos(garantia.taxId).length < 11
      ? "Faltan dígitos: son 11 en total."
      : "El número no es válido. Revise que no haya un dígito cambiado.";
  }
  if (garantia.phoneNumber.trim() !== "" && !telefonoValido(garantia.phoneNumber)) {
    errores.phoneNumber = errorDeTelefono(garantia.phoneNumber);
  }
  if (garantia.email.trim() !== "" && !correoValido(garantia.email)) {
    errores.email = "Revise el correo: tiene que ser como nombre@ejemplo.com.";
  }
  return errores;
}

/** Uno por garantía, en el mismo orden. Una lista vacía sin errores es válida: la sección es opcional. */
export function validarGarantias(garantias: GarantiaBorrador[]): ErroresDeGarantia[] {
  return garantias.map(validarGarantia);
}

export function hayErrores(errores: ErroresDeGarantia[]): boolean {
  return errores.some((porGarantia) => Object.keys(porGarantia).length > 0);
}

/** Sólo los campos del tipo, sin espacios, con el CUIT y el teléfono en dígitos. Lo vacío no viaja. */
export function armarGarantias(garantias: GarantiaBorrador[]): GuaranteeRequest[] {
  return garantias.map((garantia) => {
    const pedido: GuaranteeRequest = { type: garantia.type };
    for (const campo of camposDe(garantia.type)) {
      const texto = garantia[campo].trim();
      if (texto === "") continue;
      if (campo === "taxId") pedido.taxId = soloDigitos(texto);
      else if (campo === "phoneNumber") pedido.phoneNumber = soloDigitosTelefono(texto);
      else pedido[campo] = texto;
    }
    return pedido;
  });
}

/** Para editar un contrato que ya tiene garantías. */
export function desdeRespuesta(garantias: GuaranteeResponse[] | undefined): GarantiaBorrador[] {
  return (garantias ?? []).map((garantia) => {
    const borrador = garantiaVacia(garantia.type);
    for (const campo of camposDe(garantia.type)) {
      const valor = garantia[campo];
      if (valor) borrador[campo] = campo === "taxId" ? formatearCuit(valor) : valor;
    }
    return borrador;
  });
}

export interface ErroresDelBackend {
  /** Por garantía y campo: «0.fullName». */
  porCampo: Record<string, string>;
  /** Hubo errores que no se pudieron ubicar en un campo. */
  hayOtros: boolean;
}

/**
 * El backend ubica cada error en `guarantees[0].fullName`. Su texto está en
 * inglés, así que sólo se usa para saber *dónde* poner un aviso propio.
 */
export function erroresDelBackend(fieldErrors: Record<string, string> | null | undefined): ErroresDelBackend {
  const porCampo: Record<string, string> = {};
  let hayOtros = false;
  for (const ruta of Object.keys(fieldErrors ?? {})) {
    const coincide = /^guarantees\[(\d+)\]\.(\w+)$/.exec(ruta);
    if (coincide) porCampo[`${coincide[1]}.${coincide[2]}`] = "Revise este dato.";
    else hayOtros = true;
  }
  return { porCampo, hayOtros };
}

// --- Cómo se cuentan en el detalle del contrato ---

function conDetalle(base: string, partes: (string | false | undefined)[], separador: string, prefijo = ": "): string {
  const detalle = partes.filter(Boolean).join(separador);
  return detalle ? `${base}${prefijo}${detalle}` : base;
}

/** Una frase por garantía; lo opcional que falta se omite. */
export function describirGarantia(garantia: GuaranteeResponse): string {
  switch (garantia.type) {
    case "PERSONAL": {
      const nombre = garantia.fullName ? `: ${garantia.fullName}` : "";
      const cuit = garantia.taxId ? ` (CUIT ${formatearCuit(garantia.taxId)})` : "";
      const resto = [garantia.phoneNumber, garantia.employer && `trabaja en ${garantia.employer}`].filter(Boolean);
      const contacto = resto.length > 0 ? ` · ${resto.join(" · ")}` : "";
      return `Garante con recibo de sueldo${nombre}${cuit}${contacto}`;
    }
    case "PROPERTY":
      return conDetalle(
        garantia.fullName ? `Garantía propietaria de ${garantia.fullName}` : "Garantía propietaria",
        [garantia.propertyAddress, garantia.propertyRegistry && `matrícula ${garantia.propertyRegistry}`],
        ", "
      );
    case "SURETY_INSURANCE":
      return conDetalle(
        "Seguro de caución",
        [garantia.insurerName, garantia.policyNumber && `póliza ${garantia.policyNumber}`],
        ", "
      );
  }
}
