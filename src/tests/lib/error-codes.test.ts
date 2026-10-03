import { ApiError } from "@/lib/api";
import { ERROR, FALLBACK, copyDeError } from "@/lib/error-codes";

function errorConType(type: string | null): ApiError {
  return new ApiError(409, "English detail from backend", type);
}

describe("copyDeError", () => {
  it("devuelve el copy en español del type conocido", () => {
    const copy = copyDeError(errorConType(ERROR.DUPLICATE_TAX_ID));
    expect(copy).toBe("Ese documento ya está registrado.");
  });

  it("nunca devuelve el detail/title crudo del backend", () => {
    const copy = copyDeError(errorConType(ERROR.PAYMENT_ON_UNCONFIRMED_INVOICE));
    expect(copy).not.toContain("English");
  });

  it("cae al fallback por defecto ante un type desconocido", () => {
    const copy = copyDeError(errorConType("urn:alquia:error:no-lo-conozco"));
    expect(copy).toBe(FALLBACK);
  });

  it("cae al fallback cuando el error no trae type", () => {
    expect(copyDeError(errorConType(null))).toBe(FALLBACK);
  });

  it("cae al fallback cuando no es un ApiError", () => {
    expect(copyDeError(new Error("boom"))).toBe(FALLBACK);
  });

  it("usa el fallback propio de la pantalla cuando se pasa", () => {
    const copy = copyDeError(errorConType(null), { fallback: "Mensaje propio." });
    expect(copy).toBe("Mensaje propio.");
  });

  it("permite override del copy de un type por pantalla", () => {
    const copy = copyDeError(errorConType(ERROR.DUPLICATE_TAX_ID), {
      overrides: { [ERROR.DUPLICATE_TAX_ID]: "Ese CUIT ya tiene una cuenta." },
    });
    expect(copy).toBe("Ese CUIT ya tiene una cuenta.");
  });

  it("el override sólo afecta al type indicado, no al resto", () => {
    const copy = copyDeError(errorConType(ERROR.DUPLICATE_PHONE_NUMBER), {
      overrides: { [ERROR.DUPLICATE_TAX_ID]: "Ese CUIT ya tiene una cuenta." },
    });
    expect(copy).toBe("Ese teléfono ya está registrado.");
  });
});
