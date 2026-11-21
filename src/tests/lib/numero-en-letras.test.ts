import { enteroEnLetras, montoEnLetras } from "@/lib/numero-en-letras";

describe("enteroEnLetras", () => {
  it.each([
    [0, "cero"],
    [1, "uno"],
    [15, "quince"],
    [21, "veintiuno"],
    [29, "veintinueve"],
    [30, "treinta"],
    [31, "treinta y uno"],
    [99, "noventa y nueve"],
    [100, "cien"],
    [101, "ciento uno"],
    [115, "ciento quince"],
    [500, "quinientos"],
    [999, "novecientos noventa y nueve"],
    [1000, "mil"],
    [1001, "mil uno"],
    [2000, "dos mil"],
    [11000, "once mil"],
    [21000, "veintiún mil"],
    [31000, "treinta y un mil"],
    [100000, "cien mil"],
    [101000, "ciento un mil"],
    [450000, "cuatrocientos cincuenta mil"],
    [454500, "cuatrocientos cincuenta y cuatro mil quinientos"],
    [999999, "novecientos noventa y nueve mil novecientos noventa y nueve"],
    [1000000, "un millón"],
    [1000001, "un millón uno"],
    [1001000, "un millón mil"],
    [2000000, "dos millones"],
    [21000000, "veintiún millones"],
    [101000000, "ciento un millones"],
    [1234567, "un millón doscientos treinta y cuatro mil quinientos sesenta y siete"],
    [1000000000, "mil millones"],
    [2500000000, "dos mil quinientos millones"],
  ])("%i se dice «%s»", (n, esperado) => {
    expect(enteroEnLetras(n)).toBe(esperado);
  });

  it("rechaza lo que no es un entero no negativo menor a un billón", () => {
    expect(() => enteroEnLetras(-1)).toThrow(RangeError);
    expect(() => enteroEnLetras(1.5)).toThrow(RangeError);
    expect(() => enteroEnLetras(1e12)).toThrow(RangeError);
  });
});

describe("montoEnLetras", () => {
  it("dice pesos con centavos en cero", () => {
    expect(montoEnLetras(450000, "ARS")).toBe("Son pesos cuatrocientos cincuenta mil con 00/100");
  });

  it("toma pesos si no se indica moneda", () => {
    expect(montoEnLetras(1000)).toBe("Son pesos mil con 00/100");
  });

  it("pone los centavos como fracción sobre cien", () => {
    expect(montoEnLetras(454500.5, "ARS")).toBe("Son pesos cuatrocientos cincuenta y cuatro mil quinientos con 50/100");
    expect(montoEnLetras(10.05, "ARS")).toBe("Son pesos diez con 05/100");
  });

  it("redondea los centavos a dos decimales", () => {
    expect(montoEnLetras(100.004, "ARS")).toBe("Son pesos cien con 00/100");
    expect(montoEnLetras(100.006, "ARS")).toBe("Son pesos cien con 01/100");
    expect(montoEnLetras(99.999, "ARS")).toBe("Son pesos cien con 00/100");
  });

  it("dice dólares estadounidenses para USD", () => {
    expect(montoEnLetras(1200, "USD")).toBe("Son dólares estadounidenses mil doscientos con 00/100");
  });

  it("maneja el cero y el uno", () => {
    expect(montoEnLetras(0)).toBe("Son pesos cero con 00/100");
    expect(montoEnLetras(1)).toBe("Son pesos uno con 00/100");
  });

  it("apocopa el uno antes de mil y de millón", () => {
    expect(montoEnLetras(21000)).toBe("Son pesos veintiún mil con 00/100");
    expect(montoEnLetras(1500000)).toBe("Son pesos un millón quinientos mil con 00/100");
    expect(montoEnLetras(2000000)).toBe("Son pesos dos millones con 00/100");
  });
});
