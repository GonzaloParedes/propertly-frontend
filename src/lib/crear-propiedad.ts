import { ApiError } from "@/lib/api";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { PropertyRequest, PropertyResponse } from "@/lib/backend-types";
import { ERROR } from "@/lib/error-codes";

/** Creates a property from its draft, retrying normally if another device removed that draft. */
export async function crearPropiedadDesdeBorrador(
  pedido: PropertyRequest,
  borradorId: number | null
): Promise<PropertyResponse> {
  try {
    return await AlquiaBackendClient.properties.create(
      pedido,
      borradorId === null ? {} : { draftId: borradorId }
    );
  } catch (error) {
    if (!(error instanceof ApiError) || error.type !== ERROR.PROPERTY_DRAFT_NOT_FOUND || borradorId === null) {
      throw error;
    }
  }
  return AlquiaBackendClient.properties.create(pedido);
}
