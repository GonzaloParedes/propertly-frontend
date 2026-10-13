import { avisoDeCampo, ubicacionDeCampo, ubicacionDeErrores } from "@/lib/errores-de-alta";

describe("ubicacionDeCampo", () => {
  it("ubica cada campo de la propiedad en el paso que lo carga", () => {
    expect(ubicacionDeCampo("property.street")).toEqual({ seccion: "property", paso: 1 });
    expect(ubicacionDeCampo("property.category")).toEqual({ seccion: "property", paso: 2 });
    expect(ubicacionDeCampo("property.bedrooms")).toEqual({ seccion: "property", paso: 3 });
  });

  it("el inquilino tiene un solo paso", () => {
    expect(ubicacionDeCampo("tenant.taxId")).toEqual({ seccion: "tenant", paso: 1 });
  });

  it("ubica cada campo del contrato en su paso", () => {
    expect(ubicacionDeCampo("contract.dueDay")).toEqual({ seccion: "contract", paso: 3 });
    expect(ubicacionDeCampo("contract.termMonths")).toEqual({ seccion: "contract", paso: 4 });
    expect(ubicacionDeCampo("contract.incrementValue")).toEqual({ seccion: "contract", paso: 5 });
    expect(ubicacionDeCampo("contract.lateFeeValue")).toEqual({ seccion: "contract", paso: 6 });
    expect(ubicacionDeCampo("contract.guarantees[1].fullName")).toEqual({ seccion: "contract", paso: 6 });
  });

  it("un campo del contrato que ningún paso reconoce cae en la revisión", () => {
    expect(ubicacionDeCampo("contract.algoNuevo")).toEqual({ seccion: "contract", paso: 7 });
  });

  it("acepta la forma `property.new.street`", () => {
    expect(ubicacionDeCampo("property.new.category")).toEqual({ seccion: "property", paso: 2 });
  });

  it("un prefijo desconocido no tiene lugar", () => {
    expect(ubicacionDeCampo("elapsed")).toBeNull();
    expect(ubicacionDeCampo("otra.cosa")).toBeNull();
  });
});

describe("ubicacionDeErrores", () => {
  it("ordena propiedad, inquilino y contrato, sin repetir pasos", () => {
    const { ubicaciones, porRuta } = ubicacionDeErrores({
      "contract.dueDay": "x",
      "tenant.taxId": "x",
      "contract.initialRentAmount": "x",
      "property.street": "x",
      "property.number": "x",
    });
    expect(ubicaciones).toEqual([
      { seccion: "property", paso: 1 },
      { seccion: "tenant", paso: 1 },
      { seccion: "contract", paso: 3 },
    ]);
    expect(Object.keys(porRuta)).toHaveLength(5);
  });

  it("deja afuera lo que no tiene prefijo conocido", () => {
    const { ubicaciones, porRuta } = ubicacionDeErrores({ elapsed: "2026-06", "tenant.email": "x" });
    expect(ubicaciones).toEqual([{ seccion: "tenant", paso: 1 }]);
    expect(porRuta).toEqual({ "tenant.email": "x" });
  });

  it("sin errores no hay a dónde ir", () => {
    expect(ubicacionDeErrores(null).ubicaciones).toEqual([]);
  });
});

describe("avisoDeCampo", () => {
  it("avisa en español, nunca con el texto del backend", () => {
    expect(avisoDeCampo({ "tenant.taxId": "must be valid" }, "tenant", "taxId")).toBe("Revise este dato.");
  });

  it("sólo del campo y la sección pedidos", () => {
    expect(avisoDeCampo({ "tenant.taxId": "x" }, "tenant", "email")).toBeUndefined();
    expect(avisoDeCampo({ "tenant.taxId": "x" }, "property", "taxId")).toBeUndefined();
  });
});
