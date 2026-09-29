import { CATEGORIAS, detallePropiedad, etiquetaCategoria } from "@/lib/propiedad";
import type { PropertyResponse } from "@/lib/backend-types";

const BASE: PropertyResponse = {
  id: 1,
  street: "Lavalle",
  number: "950",
  city: "CABA",
  province: "Ciudad Autónoma de Buenos Aires",
  category: "APARTMENT",
};

describe("CATEGORIAS", () => {
  it("cubre las ocho que acepta el backend", () => {
    expect(CATEGORIAS).toHaveLength(8);
    expect(CATEGORIAS.map((c) => c.valor)).toEqual([
      "APARTMENT",
      "HOUSE",
      "PH",
      "COMMERCIAL_PREMISES",
      "OFFICE",
      "GARAGE",
      "LAND",
      "OTHER",
    ]);
  });

  it("cada una se puede nombrar y explicar", () => {
    for (const categoria of CATEGORIAS) {
      expect(categoria.etiqueta).not.toBe("");
      expect(categoria.descripcion).not.toBe("");
    }
  });
});

describe("etiquetaCategoria", () => {
  it("nombra en castellano las que llegaron con la rama nueva", () => {
    expect(etiquetaCategoria("OFFICE")).toBe("Oficina");
    expect(etiquetaCategoria("GARAGE")).toBe("Cochera");
    expect(etiquetaCategoria("LAND")).toBe("Terreno");
    expect(etiquetaCategoria("OTHER")).toBe("Otro");
  });

  it("no rompe ante una categoría que el backend sume después", () => {
    expect(etiquetaCategoria("FUTURA" as never)).toBe("Propiedad");
  });
});

describe("detallePropiedad", () => {
  it("arma la bajada con lo que la propiedad tiene", () => {
    expect(detallePropiedad({ ...BASE, coveredArea: 58 })).toBe("Departamento · CABA · 58 m²");
  });

  it("omite la superficie cuando no se cargó", () => {
    expect(detallePropiedad(BASE)).toBe("Departamento · CABA");
  });
});
