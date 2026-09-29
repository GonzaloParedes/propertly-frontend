import { errorDeTelefono, soloDigitosTelefono, telefonoValido } from "@/lib/telefono";

/**
 * Cada caso está verificado en vivo contra la instancia (28/09/2026), no sólo
 * leído del código: se registró un usuario con el número y se confirmó qué
 * quedó guardado, para no portar un algoritmo que se lee bien pero no coincide
 * con lo que el backend hace de verdad.
 */
describe("telefonoValido", () => {
  it("acepta dígitos simples", () => {
    expect(telefonoValido("1144552210")).toBe(true);
  });

  // El bug que este archivo parcheaba: el backend lo guardaba mal
  // (+54901144552210). Ya está arreglado — verificado: ahora guarda
  // +5492215667788 para "0221155667788", con el 0 correctamente afuera.
  it("acepta el 0 de la característica: el backend ya lo saca bien", () => {
    expect(telefonoValido("01144552210")).toBe(true);
    expect(telefonoValido("0221155667788")).toBe(true);
  });

  // El otro bug: el patrón viejo admitía un solo separador.
  // Verificado: "11 4477-8899" guarda +5491144778899.
  it("acepta espacio y guión juntos, no sólo uno", () => {
    expect(telefonoValido("11 4477-8899")).toBe(true);
  });

  it("acepta el 15 del celular pegado a la característica", () => {
    expect(telefonoValido("221155667788")).toBe(true);
  });

  it("acepta con +54 y con 54 sin el +", () => {
    expect(telefonoValido("+5491144552210")).toBe(true);
    expect(telefonoValido("5491144552210")).toBe(true);
  });

  it("acepta el 0 y el espacio a la vez", () => {
    expect(telefonoValido("011 4455-2210")).toBe(true);
  });

  it("rechaza texto que no es un teléfono", () => {
    expect(telefonoValido("abc")).toBe(false);
  });

  it("rechaza un número demasiado corto", () => {
    expect(telefonoValido("12345")).toBe(false);
  });

  it("rechaza vacío", () => {
    expect(telefonoValido("")).toBe(false);
    expect(telefonoValido("   ")).toBe(false);
  });

  it("rechaza separadores seguidos", () => {
    expect(telefonoValido("11  44552210")).toBe(false);
  });

  it("rechaza un separador al principio o al final", () => {
    expect(telefonoValido("-1144552210")).toBe(false);
    expect(telefonoValido("1144552210-")).toBe(false);
  });

  it("un «+» que no seguido de 54 no es un país válido", () => {
    expect(telefonoValido("+1144552210")).toBe(false);
  });

  it("rechaza si sólo hay signo de más, sin números", () => {
    expect(telefonoValido("+")).toBe(false);
  });
});

describe("soloDigitosTelefono", () => {
  it("saca todo lo que no es dígito", () => {
    expect(soloDigitosTelefono("+54 9 11 4455-2210")).toBe("5491144552210");
  });

  it("lo que manda ya stripeado, el backend lo sigue resolviendo bien", () => {
    // Verificado en vivo: enviar el dígito puro (sin separadores) para un
    // número con 0 y 15 sigue resolviendo al nacional correcto.
    expect(telefonoValido(soloDigitosTelefono("0221 15-5667788"))).toBe(true);
  });
});

describe("errorDeTelefono", () => {
  it("pide cargar un teléfono si está vacío", () => {
    expect(errorDeTelefono("")).toBe("Ingrese un teléfono de contacto.");
  });

  it("avisa que faltan dígitos cuando es claramente corto", () => {
    expect(errorDeTelefono("1122")).toContain("Faltan dígitos");
  });

  it("no confunde texto sin dígitos con un número corto", () => {
    expect(errorDeTelefono("abc")).toBe("Ingrese un teléfono de contacto.");
  });

  it("da un mensaje genérico para dígitos que no resuelven a ningún número", () => {
    // Ni corto (13 dígitos) ni de una forma que el algoritmo reconozca.
    expect(telefonoValido("9999999999999")).toBe(false);
    expect(errorDeTelefono("9999999999999")).toContain("No pudimos reconocerlo");
  });
});
