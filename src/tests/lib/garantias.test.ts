import { describe, expect, it } from "vitest";
import {
  armarGarantias, cambiarTipo, describirGarantia, desdeRespuesta, erroresDelBackend, garantiaVacia,
  hayErrores, validarGarantia, validarGarantias, type GarantiaBorrador,
} from "@/lib/garantias";

function borrador(over: Partial<GarantiaBorrador> & Pick<GarantiaBorrador, "type">): GarantiaBorrador {
  return { ...garantiaVacia(over.type), ...over };
}

describe("validarGarantia", () => {
  it("pide sólo lo obligatorio de cada tipo", () => {
    expect(Object.keys(validarGarantia(garantiaVacia("PERSONAL")))).toEqual(["fullName"]);
    expect(Object.keys(validarGarantia(garantiaVacia("PROPERTY"))).sort()).toEqual(["fullName", "propertyAddress"]);
    expect(Object.keys(validarGarantia(garantiaVacia("SURETY_INSURANCE")))).toEqual(["insurerName"]);
  });

  it("lo opcional vacío no es un error, pero mal escrito sí", () => {
    expect(validarGarantia(borrador({ type: "PERSONAL", fullName: "Ana Gómez" }))).toEqual({});
    const errores = validarGarantia(borrador({ type: "PERSONAL", fullName: "Ana", taxId: "20-12345678-0", phoneNumber: "123", email: "ana@" }));
    expect(Object.keys(errores).sort()).toEqual(["email", "phoneNumber", "taxId"]);
  });

  it("una lista vacía es válida: la sección es opcional", () => {
    expect(hayErrores(validarGarantias([]))).toBe(false);
    expect(hayErrores(validarGarantias([garantiaVacia("PERSONAL")]))).toBe(true);
  });
});

describe("armarGarantias", () => {
  it("manda sólo los campos del tipo, sin vacíos, con CUIT y teléfono en dígitos", () => {
    const pedido = armarGarantias([
      borrador({
        type: "PROPERTY", fullName: " Ana Gómez ", propertyAddress: "Av. Rivadavia 1234", taxId: "27-12345678-3",
        phoneNumber: "11 4455-2210",
        employer: "no corresponde a este tipo", insurerName: "tampoco",
      }),
    ]);
    expect(pedido).toEqual([{
      type: "PROPERTY", fullName: "Ana Gómez", propertyAddress: "Av. Rivadavia 1234",
      taxId: "27123456783", phoneNumber: "1144552210",
    }]);
  });

  it("un seguro de caución lleva aseguradora y póliza", () => {
    expect(armarGarantias([borrador({ type: "SURETY_INSURANCE", insurerName: "Aseguradora Sur", policyNumber: "4411" })]))
      .toEqual([{ type: "SURETY_INSURANCE", insurerName: "Aseguradora Sur", policyNumber: "4411" }]);
  });

  it("sin garantías manda la lista vacía, que borra las anteriores al actualizar", () => {
    expect(armarGarantias([])).toEqual([]);
  });
});

describe("cambiarTipo", () => {
  it("conserva lo que comparten garante y propiedad, y avisa de lo que se pierde", () => {
    const { garantia, perdidos } = cambiarTipo(
      borrador({ type: "PERSONAL", fullName: "Ana", taxId: "27-12345678-3", employer: "Panadería" }),
      "PROPERTY"
    );
    expect(garantia).toMatchObject({ type: "PROPERTY", fullName: "Ana", taxId: "27-12345678-3", employer: "" });
    expect(perdidos).toEqual(["employer"]);
  });

  it("de persona a seguro no queda nada en común", () => {
    const { garantia, perdidos } = cambiarTipo(borrador({ type: "PERSONAL", fullName: "Ana" }), "SURETY_INSURANCE");
    expect(garantia.fullName).toBe("");
    expect(perdidos).toEqual(["fullName"]);
  });

  it("sin datos cargados no hay nada que perder", () => {
    expect(cambiarTipo(garantiaVacia("PERSONAL"), "SURETY_INSURANCE").perdidos).toEqual([]);
  });
});

describe("desdeRespuesta", () => {
  it("vuelve a armar el borrador de un contrato existente, con el CUIT con guiones", () => {
    const [g] = desdeRespuesta([{ type: "PERSONAL", fullName: "Ana", taxId: "27123456783", employer: "Panadería" }]);
    expect(g).toMatchObject({ type: "PERSONAL", fullName: "Ana", taxId: "27-12345678-3", employer: "Panadería", phoneNumber: "" });
    expect(desdeRespuesta(undefined)).toEqual([]);
  });
});

describe("erroresDelBackend", () => {
  it("ubica cada error por garantía y campo, y no repite el texto en inglés", () => {
    const { porCampo, hayOtros } = erroresDelBackend({ "guarantees[1].fullName": "must not be blank", "guarantees[0].email": "must be a well-formed email address", otro: "x" });
    expect(porCampo).toEqual({ "1.fullName": "Revise este dato.", "0.email": "Revise este dato." });
    expect(hayOtros).toBe(true);
  });

  it("sin errores de campo no hay nada que marcar", () => {
    expect(erroresDelBackend(null)).toEqual({ porCampo: {}, hayOtros: false });
  });
});

describe("describirGarantia", () => {
  it("un garante con recibo de sueldo", () => {
    expect(describirGarantia({ type: "PERSONAL", fullName: "Ana Gómez", taxId: "27123456783", phoneNumber: "+5491144552210", employer: "Panadería Los Andes" }))
      .toBe("Garante con recibo de sueldo: Ana Gómez (CUIT 27-12345678-3) · +5491144552210 · trabaja en Panadería Los Andes");
  });

  it("omite lo opcional que falta", () => {
    expect(describirGarantia({ type: "PERSONAL", fullName: "Ana Gómez" })).toBe("Garante con recibo de sueldo: Ana Gómez");
    expect(describirGarantia({ type: "PROPERTY", fullName: "Ana Gómez", propertyAddress: "Av. Rivadavia 1234" }))
      .toBe("Garantía propietaria de Ana Gómez: Av. Rivadavia 1234");
    expect(describirGarantia({ type: "SURETY_INSURANCE", insurerName: "Aseguradora Sur" })).toBe("Seguro de caución: Aseguradora Sur");
  });

  it("una garantía propietaria con matrícula", () => {
    expect(describirGarantia({ type: "PROPERTY", fullName: "Ana Gómez", propertyAddress: "Av. Rivadavia 1234", propertyRegistry: "15-1234" }))
      .toBe("Garantía propietaria de Ana Gómez: Av. Rivadavia 1234, matrícula 15-1234");
  });
});
