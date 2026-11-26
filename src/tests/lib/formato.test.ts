import { describe, expect, it } from "vitest";
import { diferenciaEnDias, formatearMonto, formatearTotales, sumarEnMoneda, type TotalesPorMoneda } from "@/lib/formato";

describe("formatearMonto", () => {
  it("usa «$» para pesos y cuando no hay moneda", () => {
    expect(formatearMonto(150000)).toBe("$ 150.000");
    expect(formatearMonto(150000, "ARS")).toBe("$ 150.000");
  });

  it("usa «US$» para dólares, sin convertir (ALQ-187)", () => {
    expect(formatearMonto(1200, "USD")).toBe("US$ 1.200");
  });
});

describe("formatearTotales", () => {
  it("muestra cada moneda por separado, pesos primero", () => {
    const totales: TotalesPorMoneda = {};
    sumarEnMoneda(totales, 1200, "USD");
    sumarEnMoneda(totales, 300000, undefined);
    sumarEnMoneda(totales, 150000, "ARS");
    expect(totales).toEqual({ ARS: 450000, USD: 1200 });
    expect(formatearTotales(totales)).toBe("$ 450.000 · US$ 1.200");
  });

  it("omite la moneda en cero y, sin nada, dice «$ 0»", () => {
    expect(formatearTotales({ ARS: 0, USD: 800 })).toBe("US$ 800");
    expect(formatearTotales({})).toBe("$ 0");
  });
});

describe("diferenciaEnDias", () => {
  it("cuenta días de calendario, positivo hacia el futuro", () => {
    expect(diferenciaEnDias("2026-08-25", "2026-08-28")).toBe(3);
    expect(diferenciaEnDias("2026-08-25", "2026-08-10")).toBe(-15);
    expect(diferenciaEnDias("2026-08-25", "2026-08-25")).toBe(0);
  });

  it("cruza meses y años sin errores", () => {
    expect(diferenciaEnDias("2026-12-30", "2027-01-02")).toBe(3);
    expect(diferenciaEnDias("2026-02-27", "2026-03-01")).toBe(2);
  });

  it("ignora la hora si viene un instante", () => {
    expect(diferenciaEnDias("2026-08-25T23:59:00Z", "2026-08-26")).toBe(1);
  });
});
