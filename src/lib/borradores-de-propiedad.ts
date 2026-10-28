import {
  etiquetaDePropiedadEnCarga,
  type ContenidoDeBorrador,
  type FormularioDePropiedad,
  sanearFormularioPropiedad,
} from "@/lib/borradores";

export const VERSION_DEL_PAYLOAD_DE_PROPIEDAD = 1;

export type EstadoDelBorradorDePropiedad = {
  paso: number;
  formulario: FormularioDePropiedad;
};

const ES_OBJETO = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function serializarBorradorDePropiedad(
  estado: EstadoDelBorradorDePropiedad
): Record<string, unknown> {
  return { schemaVersion: VERSION_DEL_PAYLOAD_DE_PROPIEDAD, ...estado };
}

export function armarContenidoDeBorradorDePropiedad(
  estado: EstadoDelBorradorDePropiedad
): ContenidoDeBorrador {
  const etiqueta = etiquetaDePropiedadEnCarga(estado.formulario) ?? "Propiedad sin dirección";
  return {
    label: etiqueta.slice(0, 160),
    payload: serializarBorradorDePropiedad(estado),
  };
}

export function deserializarBorradorDePropiedad(
  payload: unknown
): EstadoDelBorradorDePropiedad | null {
  if (!ES_OBJETO(payload) || payload.schemaVersion !== VERSION_DEL_PAYLOAD_DE_PROPIEDAD) return null;
  const formulario = sanearFormularioPropiedad(payload.formulario);
  if (formulario === null) return null;
  const paso = typeof payload.paso === "number" && Number.isInteger(payload.paso) ? payload.paso : 1;
  return { paso: Math.min(Math.max(paso, 1), 4), formulario };
}
