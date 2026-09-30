import type { PropertyCategory, PropertyResponse } from "@/lib/backend-types";

/**
 * Cómo se dice cada categoría en pantalla, y cómo se explica al elegirla en el
 * alta. Es la única lista: el asistente la usa para armar sus opciones y las
 * listas para nombrar la categoría de una propiedad ya cargada, así que un
 * valor nuevo entra en un solo lugar.
 *
 * Las ocho que el backend acepta desde `codex/frontend-integration-lots`. El
 * orden es el de frecuencia esperada, no el del enum: lo primero que se ofrece
 * es lo que más se alquila.
 */
export const CATEGORIAS: {
  valor: PropertyCategory;
  etiqueta: string;
  descripcion: string;
}[] = [
  { valor: "APARTMENT", etiqueta: "Departamento", descripcion: "Una unidad dentro de un edificio" },
  { valor: "HOUSE", etiqueta: "Casa", descripcion: "Vivienda independiente, con su propio terreno" },
  { valor: "PH", etiqueta: "PH", descripcion: "Unidad con entrada propia, sin ascensor ni palier común" },
  { valor: "COMMERCIAL_PREMISES", etiqueta: "Local comercial", descripcion: "Para actividad comercial, no para vivienda" },
  { valor: "OFFICE", etiqueta: "Oficina", descripcion: "Espacio de trabajo dentro de un edificio comercial" },
  { valor: "GARAGE", etiqueta: "Cochera", descripcion: "Un lugar para guardar un vehículo" },
  { valor: "LAND", etiqueta: "Terreno", descripcion: "Un lote sin construir" },
  { valor: "OTHER", etiqueta: "Otro", descripcion: "Cualquier inmueble que no entre en las anteriores" },
];

const POR_VALOR = new Map(CATEGORIAS.map((c) => [c.valor, c.etiqueta]));

export function etiquetaCategoria(categoria: PropertyCategory): string {
  return POR_VALOR.get(categoria) ?? "Propiedad";
}

/** La bajada de una propiedad en una lista: «Departamento · CABA · 58 m²». */
export function detallePropiedad(property: PropertyResponse): string {
  return [
    etiquetaCategoria(property.category),
    property.city,
    property.coveredArea ? `${property.coveredArea} m²` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
