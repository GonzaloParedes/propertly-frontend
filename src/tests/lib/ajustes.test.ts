import {
  describirAjuste,
  efectoDeAjuste,
  efectoDeFormulario,
  itemARequest,
  itemValido,
  totalPrevisualizado,
  type FormularioItem,
} from "@/lib/ajustes";
import type { AdjustmentResponse } from "@/lib/backend-types";

const descuento: AdjustmentResponse = {
  id: 1,
  name: "Reparación acordada",
  kind: "DISCOUNT",
  valueType: "FIXED_AMOUNT",
  value: 50000,
};

const form = (over: Partial<FormularioItem> = {}): FormularioItem => ({
  nombre: "Baño roto",
  kind: "SURCHARGE",
  valueType: "FIXED_AMOUNT",
  value: 250000,
  ...over,
});

describe("efectoDeAjuste", () => {
  it("un descuento fijo resta", () => {
    expect(efectoDeAjuste(descuento, 700000)).toBe(-50000);
  });

  it("un recargo fijo suma", () => {
    expect(efectoDeAjuste({ ...descuento, kind: "SURCHARGE" }, 700000)).toBe(50000);
  });

  // Verificado contra la instancia: base 700.000, 10 % → 630.000.
  it("un porcentual se calcula sobre el importe base, no sobre el total", () => {
    const porcentual: AdjustmentResponse = {
      ...descuento,
      valueType: "PERCENTAGE",
      value: 10,
    };
    expect(efectoDeAjuste(porcentual, 700000)).toBe(-70000);
  });
});

describe("describirAjuste", () => {
  it("el signo es parte del dato", () => {
    expect(describirAjuste(descuento, 700000)).toEqual({
      id: 1,
      nombre: "Reparación acordada",
      efecto: "− $ 50.000",
      detalle: null,
    });
  });

  it("un recargo se anuncia con más", () => {
    expect(describirAjuste({ ...descuento, kind: "SURCHARGE" }, 700000).efecto).toBe(
      "+ $ 50.000"
    );
  });

  it("un porcentual dice también el porcentaje", () => {
    const linea = describirAjuste(
      { ...descuento, valueType: "PERCENTAGE", value: 10 },
      700000
    );
    expect(linea.efecto).toBe("− $ 70.000");
    expect(linea.detalle).toBe("10 % del importe base");
  });
});

describe("itemARequest", () => {
  it("arma el request y recorta el nombre", () => {
    expect(itemARequest(form({ nombre: "  Baño roto  " }))).toEqual({
      name: "Baño roto",
      kind: "SURCHARGE",
      valueType: "FIXED_AMOUNT",
      value: 250000,
    });
  });
});

describe("efectoDeFormulario", () => {
  it("un recargo fijo suma su monto", () => {
    expect(efectoDeFormulario(form({ value: 250000 }), 1500000)).toBe(250000);
  });

  it("un descuento porcentual resta sobre el base", () => {
    expect(
      efectoDeFormulario(form({ kind: "DISCOUNT", valueType: "PERCENTAGE", value: 10 }), 1500000)
    ).toBe(-150000);
  });
});

describe("totalPrevisualizado", () => {
  it("suma base + ajustes existentes + el ítem en edición", () => {
    const existentes: AdjustmentResponse[] = [
      { id: 7, name: "Ducha", kind: "SURCHARGE", valueType: "FIXED_AMOUNT", value: 150000 },
    ];
    // 1.500.000 + 150.000 (ducha) + 250.000 (baño nuevo) = 1.900.000
    expect(totalPrevisualizado(1500000, existentes, form({ value: 250000 }), null)).toBe(1900000);
  });

  it("excluye el ajuste que se está editando para no contarlo dos veces", () => {
    const existentes: AdjustmentResponse[] = [
      { id: 7, name: "Ducha", kind: "SURCHARGE", valueType: "FIXED_AMOUNT", value: 150000 },
    ];
    // Editando el id 7: no se suma el viejo 150.000, sólo el nuevo valor del form.
    expect(
      totalPrevisualizado(1500000, existentes, form({ value: 200000 }), 7)
    ).toBe(1700000);
  });
});

describe("itemValido", () => {
  it("rechaza un ítem sin nombre", () => {
    expect(itemValido(form({ nombre: "  " }), 1500000, [], null)).toBe(false);
  });

  it("rechaza un valor que no es mayor a cero", () => {
    expect(itemValido(form({ value: 0 }), 1500000, [], null)).toBe(false);
  });

  it("rechaza un descuento que deja el total negativo", () => {
    expect(
      itemValido(form({ kind: "DISCOUNT", value: 1600000 }), 1500000, [], null)
    ).toBe(false);
  });

  it("acepta un ítem válido", () => {
    expect(itemValido(form({ value: 250000 }), 1500000, [], null)).toBe(true);
  });
});
