import { coincideTexto } from "@/lib/busqueda";

describe("coincideTexto", () => {
  it("un texto vacío no filtra", () => {
    expect(coincideTexto(["Mitre 78"], "  ")).toBe(true);
  });

  it("ignora tildes y mayúsculas", () => {
    expect(coincideTexto(["Av. Rivadavia 2340", "Jorge Pérez"], "perez")).toBe(true);
    expect(coincideTexto(["Mitre 78", "Ana"], "RIVADAVIA")).toBe(false);
  });

  it("encuentra en cualquiera de las partes", () => {
    expect(coincideTexto(["Mitre 78", "Ana Gómez"], "gomez")).toBe(true);
  });
});
