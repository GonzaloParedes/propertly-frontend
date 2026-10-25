/**
 * `POST /contracts/onboarding` valida todo antes de crear nada y ubica cada error con un prefijo:
 * `property.street`, `tenant.taxId`, `contract.dueDay`. Acá se decide a qué pantalla del asistente
 * pertenece cada uno, para llevar al propietario justo donde puede corregirlo.
 */
export type Ubicacion = { seccion: "property" | "tenant" | "contract"; paso: number };

const SECCIONES = ["property", "tenant", "contract"] as const;

/** Paso de la propiedad (1 dirección, 2 tipo, 3 características) que tiene cada campo. */
const PASO_DE_PROPIEDAD: Record<string, number> = {
  category: 2,
  bedrooms: 3,
  bathrooms: 3,
  coveredArea: 3,
  petsAllowed: 3,
  furnished: 3,
};

/** Paso del contrato que tiene cada campo: 3 alquiler, 4 plazo, 5 actualización, 6 otras condiciones. */
const PASO_DE_CONTRATO: Record<string, number> = {
  initialRentAmount: 3,
  dueDay: 3,
  startDate: 4,
  termMonths: 4,
  incrementMethod: 5,
  incrementValue: 5,
  incrementIndexName: 5,
  incrementFrequencyMonths: 5,
  depositAmount: 6,
  commissionPercent: 6,
  commissionPayer: 6,
  lateFeeMethod: 6,
  lateFeeValue: 6,
  lateFeeGraceDays: 6,
  guarantees: 6,
};

/** El paso de revisión, para un campo del contrato que ningún paso reconoce. */
const REVISION = 7;

function partes(ruta: string): { seccion: Ubicacion["seccion"]; campo: string } | null {
  const [seccion, ...resto] = ruta.split(".");
  if (!(SECCIONES as readonly string[]).includes(seccion)) return null;
  // Un campo de una propiedad o inquilino nuevos puede venir como `property.new.street`.
  const camino = resto[0] === "new" ? resto.slice(1) : resto;
  const campo = (camino[0] ?? "").replace(/\[\d+\]$/, "");
  return { seccion: seccion as Ubicacion["seccion"], campo };
}

export function ubicacionDeCampo(ruta: string): Ubicacion | null {
  const encontrada = partes(ruta);
  if (!encontrada) return null;
  const { seccion, campo } = encontrada;
  if (seccion === "property") return { seccion, paso: PASO_DE_PROPIEDAD[campo] ?? 1 };
  if (seccion === "tenant") return { seccion, paso: 1 };
  return { seccion, paso: PASO_DE_CONTRATO[campo] ?? REVISION };
}

const ORDEN: Record<Ubicacion["seccion"], number> = { property: 0, tenant: 1, contract: 2 };

export interface ErroresDeAlta {
  /** Sólo los errores con prefijo conocido, por su ruta completa. */
  porRuta: Record<string, string>;
  /** Dónde corregirlos, sin repetir y en el orden en que se recorre el asistente. */
  ubicaciones: Ubicacion[];
}

export function ubicacionDeErrores(fieldErrors: Record<string, string> | null | undefined): ErroresDeAlta {
  const porRuta: Record<string, string> = {};
  const vistas = new Map<string, Ubicacion>();
  for (const [ruta, mensaje] of Object.entries(fieldErrors ?? {})) {
    const ubicacion = ubicacionDeCampo(ruta);
    if (!ubicacion) continue;
    porRuta[ruta] = mensaje;
    vistas.set(`${ubicacion.seccion}:${ubicacion.paso}`, ubicacion);
  }
  const ubicaciones = [...vistas.values()].sort((a, b) => ORDEN[a.seccion] - ORDEN[b.seccion] || a.paso - b.paso);
  return { porRuta, ubicaciones };
}

/** ¿Hay un error del backend para alguno de estos campos? Devuelve el aviso en español. */
export function avisoDeCampo(porRuta: Record<string, string>, seccion: Ubicacion["seccion"], ...campos: string[]): string | undefined {
  const hay = Object.keys(porRuta).some((ruta) => {
    const encontrada = partes(ruta);
    return encontrada?.seccion === seccion && campos.includes(encontrada.campo);
  });
  return hay ? "Revise este dato." : undefined;
}
