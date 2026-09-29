import {
  describirRecordatorios,
  DIAS_MAX,
  DIAS_MIN,
  resumenRecordatorios,
} from "@/lib/recordatorios";
import type { ReminderSettingsResponse } from "@/lib/backend-types";

const BASE: ReminderSettingsResponse = {
  daysBeforeDue: 7,
  dueDateReminderEnabled: true,
  daysAfterDue: 3,
  enabled: true,
};

describe("límites", () => {
  it("son los que acepta el backend", () => {
    expect(DIAS_MIN).toBe(0);
    expect(DIAS_MAX).toBe(30);
  });
});

describe("describirRecordatorios", () => {
  it("dice los tres valores", () => {
    expect(describirRecordatorios(BASE)).toEqual([
      { etiqueta: "Antes del vencimiento", valor: "7 días" },
      { etiqueta: "El día del vencimiento", valor: "Se avisa" },
      { etiqueta: "Después del vencimiento", valor: "3 días" },
    ]);
  });

  // Un cero no es «cero días»: es que ese aviso no se manda.
  it("un valor en cero se dice como que no se avisa", () => {
    const sinPrevio = describirRecordatorios({ ...BASE, daysBeforeDue: 0 });
    expect(sinPrevio[0].valor).toBe("No se avisa");
  });

  it("el aviso del día del vencimiento apagado se dice", () => {
    const r = describirRecordatorios({ ...BASE, dueDateReminderEnabled: false });
    expect(r[1].valor).toBe("No se avisa");
  });

  it("un solo día va en singular", () => {
    expect(describirRecordatorios({ ...BASE, daysBeforeDue: 1 })[0].valor).toBe("1 día");
  });
});

describe("resumenRecordatorios", () => {
  it("con los avisos activos describe qué recibe el inquilino", () => {
    expect(resumenRecordatorios(BASE)).toContain("recibe estos avisos");
  });

  it("apagados lo dice en vez de listar días que no se usan", () => {
    expect(resumenRecordatorios({ ...BASE, enabled: false })).toContain("desactivados");
  });
});
