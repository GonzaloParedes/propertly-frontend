import type { ContractDraftSummary } from "@/lib/backend-types";
import type { FormularioDeInquilino, FormularioDePropiedad } from "@/lib/borradores";

const DIA = 86_400_000;

export const FORMULARIO_DE_PROPIEDAD_VACIO: FormularioDePropiedad = {
  direccion: null, unidad: "", categoria: null, bedrooms: null, bathrooms: null, superficie: "", mascotas: false, amoblada: false,
};
export const FORMULARIO_DE_INQUILINO_VACIO: FormularioDeInquilino = { nombre: "", apellido: "", cuit: "", correo: "", telefono: "" };

/** Lo que el payload v2 suma a un estado: sin desvío abierto y con los dos formularios vacíos. */
export const SIN_DESVIO = {
  desvio: null,
  formularioPropiedad: FORMULARIO_DE_PROPIEDAD_VACIO,
  formularioInquilino: FORMULARIO_DE_INQUILINO_VACIO,
} as const;

/**
 * Un borrador como lo lista el backend, con fechas relativas a `ahora` para que los textos
 * («editado hace 3 días», «se descarta el …») no dependan del día en que corren los tests.
 */
export function resumenDeBorrador({
  id = 5,
  label = "Lavalle 950 · Pérez",
  editadoHaceDias = 3,
  venceEnDias = 87,
  conPdf = false,
  ahora = new Date(),
}: {
  id?: number;
  label?: string;
  editadoHaceDias?: number;
  venceEnDias?: number;
  conPdf?: boolean;
  ahora?: Date;
} = {}): ContractDraftSummary {
  const actualizado = new Date(ahora.getTime() - editadoHaceDias * DIA).toISOString();
  return {
    id,
    label,
    version: 2,
    createdAt: actualizado,
    updatedAt: actualizado,
    expiresAt: new Date(ahora.getTime() + venceEnDias * DIA).toISOString(),
    document: conPdf ? { fileName: "contrato.pdf", sizeBytes: 2048, pages: 4, uploadedAt: actualizado } : null,
  };
}
