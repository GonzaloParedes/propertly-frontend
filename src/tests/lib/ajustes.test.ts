import { calcularDelta, describirAjuste, describirDelta, efectoDeAjuste } from "@/lib/ajustes";
import type { AdjustmentResponse } from "@/lib/backend-types";

const descuento: AdjustmentResponse = {
  id: 1,
  name: "Reparación acordada",
  kind: "DISCOUNT",
  valueType: "FIXED_AMOUNT",
  value: 50000,
};

describe("calcularDelta", () => {
  it("cobrar menos guarda un descuento por la diferencia", () => {
    expect(calcularDelta(450000, 500000)).toEqual({
      kind: "DISCOUNT",
      valueType: "FIXED_AMOUNT",
      value: 50000,
    });
  });

  it("cobrar más guarda un recargo", () => {
    expect(calcularDelta(530000, 500000)).toEqual({
      kind: "SURCHARGE",
      valueType: "FIXED_AMOUNT",
      value: 30000,
    });
  });

  // Guardar un ajuste de cero ensucia la cuota con una línea que no hace nada.
  it("el mismo importe no genera ajuste", () => {
    expect(calcularDelta(500000, 500000)).toBeNull();
  });

  it("se calcula contra el total vigente, no contra el base", () => {
    // La cuota ya tenía un descuento: el total vigente es 450.000.
    expect(calcularDelta(500000, 450000)).toEqual({
      kind: "SURCHARGE",
      valueType: "FIXED_AMOUNT",
      value: 50000,
    });
  });

  it("no arrastra basura de coma flotante", () => {
    expect(calcularDelta(100.1, 100.2)?.value).toBe(0.1);
  });
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

describe("describirDelta", () => {
  it("anuncia el descuento antes de guardarlo", () => {
    expect(describirDelta(calcularDelta(450000, 500000))).toContain("descuento de $ 50.000");
  });

  it("anuncia el recargo", () => {
    expect(describirDelta(calcularDelta(530000, 500000))).toContain("recargo de $ 30.000");
  });

  it("sin diferencia lo dice en vez de prometer un guardado", () => {
    expect(describirDelta(null)).toContain("no cambia");
  });
});
