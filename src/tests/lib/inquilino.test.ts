import { nombreCompleto, nombreDeInquilino, nombreParaElPedido } from "@/lib/inquilino";

const VACIO = { personaJuridica: false, nombre: "", apellido: "", razonSocial: "" };

describe("nombreDeInquilino (ALQ-191)", () => {
  it("muestra nombre y apellido de una persona física", () => {
    expect(nombreDeInquilino({ firstName: "Jorge", lastName: "Paletta" })).toBe("Jorge Paletta");
    expect(nombreDeInquilino({ firstName: "Jorge", lastName: "Paletta", legalEntity: false, businessName: null })).toBe("Jorge Paletta");
  });

  it("muestra la razón social de una persona jurídica", () => {
    expect(nombreDeInquilino({ firstName: null, lastName: null, legalEntity: true, businessName: "Gómez Hermanos S.R.L." })).toBe("Gómez Hermanos S.R.L.");
  });
});

describe("nombreCompleto", () => {
  it("pide nombre y apellido sin el tilde", () => {
    expect(nombreCompleto({ ...VACIO, nombre: "Jorge" })).toBe(false);
    expect(nombreCompleto({ ...VACIO, nombre: "Jorge", apellido: "Paletta", razonSocial: "" })).toBe(true);
  });

  it("pide sólo la razón social con el tilde", () => {
    expect(nombreCompleto({ ...VACIO, personaJuridica: true, nombre: "Jorge", apellido: "Paletta" })).toBe(false);
    expect(nombreCompleto({ ...VACIO, personaJuridica: true, razonSocial: " Acme " })).toBe(true);
  });
});

describe("nombreParaElPedido", () => {
  it("una persona física manda sólo nombre y apellido, como antes", () => {
    expect(nombreParaElPedido({ ...VACIO, nombre: " Jorge ", apellido: "Paletta", razonSocial: "Acme" })).toEqual({ firstName: "Jorge", lastName: "Paletta" });
  });

  it("una persona jurídica manda el flag y la razón social", () => {
    expect(nombreParaElPedido({ personaJuridica: true, nombre: "Jorge", apellido: "Paletta", razonSocial: " Acme S.A. " })).toEqual({ legalEntity: true, businessName: "Acme S.A." });
  });
});
