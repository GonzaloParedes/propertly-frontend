import type { ContractDraftSummary } from "@/lib/backend-types";

const DIA = 86_400_000;

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
