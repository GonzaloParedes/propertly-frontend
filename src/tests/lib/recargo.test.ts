import { describe, expect, it } from "vitest";
import type { InvoiceResponse, LateFeeResponse } from "@/lib/backend-types";
import { recargoEditable, validarImporteDeRecargo, vistaDeRecargo } from "@/lib/recargo";
import { formatearDiaMes, hoyEnArgentina } from "@/lib/formato";

function recargo(over: Partial<LateFeeResponse> = {}): LateFeeResponse {
  return {
    method: "PERCENT_PER_DAY", value: 1.5, accruesFrom: "2026-10-11", asOf: "2026-10-14",
    daysLate: 3, amount: 6750, nextDayAmount: 9000, state: "ACCRUING", overridden: false, ...over,
  };
}

function cuota(lateFee: LateFeeResponse | null, amountDue = 456750): InvoiceResponse {
  return {
    id: 1000, contractId: 100, period: "2026-10-01", dueDate: "2026-10-10",
    baseAmount: 450000, total: 450000, amountDue, lateFee, status: "DUE", confirmed: true,
    adjustments: [], payments: [],
  };
}

describe("vistaDeRecargo", () => {
  it("sin recargo en la cuota no hay nada que mostrar", () => {
    expect(vistaDeRecargo(cuota(null), "inquilino")).toBeNull();
  });

  it("corriendo: el recargo de hoy y lo que se adeuda desde mañana", () => {
    expect(vistaDeRecargo(cuota(recargo()), "inquilino")).toEqual({
      etiqueta: "Recargo por atraso", monto: "$ 6.750", detalle: null,
      desdeManana: "$ 459.000", modificado: null,
    });
  });

  it("corriendo sin cambio para mañana: no hay línea «Desde mañana»", () => {
    const vista = vistaDeRecargo(cuota(recargo({ nextDayAmount: 6750 })), "inquilino");
    expect(vista?.desdeManana).toBeNull();
  });

  it("antes de empezar: dice desde cuándo y cuánto suma, sin importe de hoy", () => {
    const vista = vistaDeRecargo(
      cuota(recargo({ state: "NOT_STARTED", amount: 0, nextDayAmount: 2250, accruesFrom: "2026-10-16" }), 450000),
      "inquilino"
    );
    expect(vista).toMatchObject({
      monto: null, desdeManana: null,
      detalle: "Desde el 16/10 se suma un recargo de $ 2.250 por día",
    });
  });

  it("una multa única antes de empezar no se dice «por día»", () => {
    const vista = vistaDeRecargo(
      cuota(recargo({ method: "FIXED_ONCE", state: "NOT_STARTED", amount: 0, nextDayAmount: 20000, accruesFrom: "2026-10-16" }), 450000),
      "inquilino"
    );
    expect(vista?.detalle).toBe("Desde el 16/10 se suma una multa de $ 20.000");
  });

  it("antes de empezar y sin nada que sumar, no se muestra", () => {
    expect(vistaDeRecargo(cuota(recargo({ state: "NOT_STARTED", amount: 0, nextDayAmount: 0 })), "inquilino")).toBeNull();
  });

  it("congelado por un comprobante: la fecha del cálculo y sin «Desde mañana»", () => {
    const vista = vistaDeRecargo(cuota(recargo({ state: "FROZEN", asOf: "2026-10-18", nextDayAmount: 6750 })), "inquilino");
    expect(vista).toMatchObject({
      monto: "$ 6.750", desdeManana: null,
      detalle: "Calculado al 18/10, el día que se envió el comprobante",
    });
  });

  it("saldado: muestra el recargo que se pagó", () => {
    const vista = vistaDeRecargo(cuota(recargo({ state: "SETTLED", nextDayAmount: 6750 })), "propietario");
    expect(vista).toMatchObject({ monto: "$ 6.750", detalle: "Recargo pagado", desdeManana: null });
  });

  describe("recargo modificado a mano", () => {
    it("el propietario ve «modificado» si queda un importe y «perdonado» si queda en cero", () => {
      expect(vistaDeRecargo(cuota(recargo({ overridden: true, amount: 3000, nextDayAmount: 3000 })), "propietario")?.modificado)
        .toBe("Recargo modificado");
      const perdonado = vistaDeRecargo(cuota(recargo({ overridden: true, amount: 0, nextDayAmount: 0 }), 450000), "propietario");
      expect(perdonado).toMatchObject({ monto: null, modificado: "Recargo perdonado" });
    });

    it("el inquilino no lo ve, y un recargo perdonado no le muestra nada", () => {
      expect(vistaDeRecargo(cuota(recargo({ overridden: true, amount: 3000, nextDayAmount: 3000 })), "inquilino")?.modificado).toBeNull();
      expect(vistaDeRecargo(cuota(recargo({ overridden: true, amount: 0, nextDayAmount: 0 }), 450000), "inquilino")).toBeNull();
    });
  });

  it("no acumula error de punto flotante al sumar", () => {
    const vista = vistaDeRecargo(cuota(recargo({ amount: 0.1, nextDayAmount: 0.3 }), 450000.1), "inquilino");
    expect(vista?.desdeManana).toBe("$ 450.000");
  });
});

describe("fechas del recargo", () => {
  it("formatearDiaMes deja día y mes", () => {
    expect(formatearDiaMes("2026-10-06")).toBe("06/10");
  });

  it("hoyEnArgentina cambia de día a la medianoche argentina, no a la UTC", () => {
    // 23:30 del 10/10 en Buenos Aires ya es el 11/10 en UTC.
    expect(hoyEnArgentina(new Date("2026-10-11T02:30:00Z"))).toBe("2026-10-10");
    expect(hoyEnArgentina(new Date("2026-10-11T03:05:00Z"))).toBe("2026-10-11");
  });
});

describe("recargoEditable", () => {
  it("con recargo corriendo, el tope es el de hoy", () => {
    expect(recargoEditable(cuota(recargo()))).toEqual({ actual: 6750, maximo: 6750, modificado: false });
  });

  it("con el recargo modificado, el tope del contrato ya no se conoce", () => {
    expect(recargoEditable(cuota(recargo({ overridden: true, amount: 3000 })))).toEqual({ actual: 3000, maximo: null, modificado: true });
  });

  it("un recargo perdonado se puede volver a calcular", () => {
    expect(recargoEditable(cuota(recargo({ overridden: true, amount: 0 })))).toEqual({ actual: 0, maximo: null, modificado: true });
  });

  it("no hay nada que cambiar sin recargo, con recargo en cero sin tocar, o con la cuota paga", () => {
    expect(recargoEditable(cuota(null))).toBeNull();
    expect(recargoEditable(cuota(recargo({ state: "NOT_STARTED", amount: 0 })))).toBeNull();
    expect(recargoEditable({ ...cuota(recargo({ state: "SETTLED" })), status: "PAID" })).toBeNull();
  });
});

describe("validarImporteDeRecargo", () => {
  it("entiende cómo se escribe un importe en Argentina", () => {
    expect(validarImporteDeRecargo("3.000", null)).toEqual({ valor: 3000 });
    expect(validarImporteDeRecargo("3000,50", null)).toEqual({ valor: 3000.5 });
    expect(validarImporteDeRecargo("$ 1.250.000", null)).toEqual({ valor: 1250000 });
    expect(validarImporteDeRecargo("0", null)).toEqual({ valor: 0 });
  });

  it("pide un importe cuando está vacío o no es un número", () => {
    expect(validarImporteDeRecargo("", null)).toHaveProperty("error");
    expect(validarImporteDeRecargo("mucho", null)).toHaveProperty("error");
    expect(validarImporteDeRecargo("-5", null)).toHaveProperty("error");
  });

  it("no deja pasar el máximo y lo dice", () => {
    expect(validarImporteDeRecargo("10.000", 6750)).toEqual({
      error: "El máximo es $ 6.750, el recargo de hoy según el contrato.",
    });
    expect(validarImporteDeRecargo("6.750", 6750)).toEqual({ valor: 6750 });
  });
});
