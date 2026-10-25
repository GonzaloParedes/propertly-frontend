import { ApiError } from "@/lib/api";
import {
  ERROR,
  FALLBACK,
  copyDeError,
  idDelContratoActivo,
  idDelInquilinoExistente,
  limiteDeBorradores,
  versionActualDelBorrador,
} from "@/lib/error-codes";

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

describe("rechazos del comprobante de pago", () => {
  it("un archivo que no es imagen dice qué formatos sirven", () => {
    const copy = copyDeError(errorConType(ERROR.PAYMENT_RECEIPT_NOT_IMAGE));
    expect(copy).toBe("El comprobante tiene que ser una imagen PNG, JPG o WebP.");
    expect(copy).not.toMatch(/payment-receipt|English/i);
  });

  it("un archivo vacío pide subir una imagen", () => {
    const copy = copyDeError(errorConType(ERROR.PAYMENT_RECEIPT_EMPTY));
    expect(copy).toBe("El comprobante está vacío. Suba una imagen PNG, JPG o WebP.");
    expect(copy).not.toMatch(/payment-receipt|English/i);
  });
});

describe("extensiones de un conflicto del alta de contrato", () => {
  const conExtensiones = (extensions: Record<string, unknown> | null) =>
    new ApiError(409, "Conflict", ERROR.DUPLICATE_TAX_ID, null, extensions);

  it("lee el inquilino que ya existe y el contrato vigente", () => {
    expect(idDelInquilinoExistente(conExtensiones({ existingTenantId: 7 }))).toBe(7);
    expect(idDelContratoActivo(conExtensiones({ activeContractId: 42 }))).toBe(42);
  });

  it("sin la extensión, o con otra cosa que un número, devuelve null", () => {
    expect(idDelInquilinoExistente(conExtensiones(null))).toBeNull();
    expect(idDelInquilinoExistente(conExtensiones({ existingTenantId: "7" }))).toBeNull();
    expect(idDelContratoActivo(new Error("otro"))).toBeNull();
  });
});

describe("rechazos de la lectura de un contrato", () => {
  const rechazos = [
    ERROR.IMPORT_FILE_TOO_LARGE,
    ERROR.IMPORT_FILE_NOT_PDF,
    ERROR.IMPORT_FILE_CORRUPT,
    ERROR.IMPORT_FILE_ENCRYPTED,
    ERROR.IMPORT_FILE_TOO_MANY_PAGES,
    ERROR.IMPORT_FILE_ACTIVE_CONTENT,
    ERROR.IMPORT_QUOTA_EXCEEDED,
    ERROR.AI_IMPORTS_UNAVAILABLE,
  ];

  it.each(rechazos)("%s tiene un texto propio en español, no el genérico", (type) => {
    const copy = copyDeError(errorConType(type));
    expect(copy).not.toBe(FALLBACK);
    expect(copy).not.toContain("English");
  });

  it("al archivo con contraseña le dice qué hacer", () => {
    expect(copyDeError(errorConType(ERROR.IMPORT_FILE_ENCRYPTED))).toMatch(/contraseña/i);
  });
});

describe("errores de los borradores de contrato", () => {
  const tipos = [
    ERROR.CONTRACT_DRAFT_LIMIT_REACHED,
    ERROR.CONTRACT_DRAFT_VERSION_CONFLICT,
    ERROR.CONTRACT_DRAFT_TOO_LARGE,
    ERROR.CONTRACT_DRAFT_PAYLOAD_INVALID,
    ERROR.CONTRACT_DRAFT_NOT_FOUND,
  ];

  it.each(tipos)("%s tiene un texto propio en español, no el genérico", (type) => {
    const copy = copyDeError(errorConType(type));
    expect(copy).not.toBe(FALLBACK);
    expect(copy).not.toMatch(/draft|English/i);
  });

  it("lee la versión actual y el límite que manda el backend", () => {
    const conflicto = new ApiError(409, "x", ERROR.CONTRACT_DRAFT_VERSION_CONFLICT, null, { currentVersion: 4 });
    const tope = new ApiError(409, "x", ERROR.CONTRACT_DRAFT_LIMIT_REACHED, null, { limit: 3 });
    expect(versionActualDelBorrador(conflicto)).toBe(4);
    expect(limiteDeBorradores(tope)).toBe(3);
  });

  it("sin la extensión, o con otra cosa que un número, devuelve null", () => {
    expect(versionActualDelBorrador(new ApiError(409, "x", null, null, null))).toBeNull();
    expect(versionActualDelBorrador(new ApiError(409, "x", null, null, { currentVersion: "4" }))).toBeNull();
    expect(limiteDeBorradores(new Error("otro"))).toBeNull();
  });
});
