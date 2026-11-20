import type { NombreDeInquilino, TenantRequest } from "@/lib/backend-types";

/**
 * Cómo se muestra un inquilino en listados, contratos, cobranzas y el portal:
 * la razón social si es persona jurídica, «nombre apellido» si no (ALQ-191).
 * Se arma acá y no con `displayName` para no depender de que el backend lo mande.
 */
export function nombreDeInquilino(inquilino: NombreDeInquilino): string {
  if (inquilino.legalEntity) return (inquilino.businessName ?? "").trim();
  return `${inquilino.firstName ?? ""} ${inquilino.lastName ?? ""}`.trim();
}

/** Lo que el formulario necesita para dar por completo el nombre del inquilino. */
export interface CamposDeNombre {
  personaJuridica: boolean;
  nombre: string;
  apellido: string;
  razonSocial: string;
}

/** Persona jurídica: alcanza la razón social. Persona física: nombre y apellido. */
export function nombreCompleto({ personaJuridica, nombre, apellido, razonSocial }: CamposDeNombre): boolean {
  return personaJuridica ? razonSocial.trim() !== "" : nombre.trim() !== "" && apellido.trim() !== "";
}

/**
 * Los campos de nombre que viajan al backend: sólo los del tipo elegido. Una persona física
 * manda lo mismo que antes de ALQ-191: sin `legalEntity`, el backend la toma como física.
 */
export function nombreParaElPedido({ personaJuridica, nombre, apellido, razonSocial }: CamposDeNombre): Pick<TenantRequest, "firstName" | "lastName" | "legalEntity" | "businessName"> {
  return personaJuridica
    ? { legalEntity: true, businessName: razonSocial.trim() }
    : { firstName: nombre.trim(), lastName: apellido.trim() };
}
