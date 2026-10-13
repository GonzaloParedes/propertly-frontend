import { describe, expect, it } from "vitest";
import { consecuenciaDe, faltaResponder, mesesTranscurridos, NINGUNO, paidThroughDe, periodosDelBackend } from "@/lib/transcurridos";

const base = { inicioISO: "2026-06-01", plazoMeses: 36, diaVencimiento: 10, hoyISO: "2026-10-10" };

describe("mesesTranscurridos", () => {
  it("de junio a octubre con vencimiento el 10: el 10/10 todavía no pasó", () => {
    expect(mesesTranscurridos(base)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09"]);
  });

  it("un día después, octubre también cuenta", () => {
    expect(mesesTranscurridos({ ...base, hoyISO: "2026-10-11" })).toEqual(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
  });

  it("un contrato que arranca este mes con el vencimiento por delante no pregunta nada", () => {
    expect(mesesTranscurridos({ ...base, inicioISO: "2026-10-01" })).toEqual([]);
    expect(mesesTranscurridos({ ...base, inicioISO: "2026-12-01" })).toEqual([]);
  });

  it("arrancar a mitad de mes cuenta ese mes si su vencimiento ya pasó", () => {
    expect(mesesTranscurridos({ ...base, inicioISO: "2026-09-15" })).toEqual(["2026-09"]);
  });

  it("cruza años: un contrato de marzo de 2025 tiene 19 cuotas transcurridas en octubre de 2026", () => {
    const meses = mesesTranscurridos({ ...base, inicioISO: "2025-03-01" });
    expect(meses).toHaveLength(19);
    expect(meses[0]).toBe("2025-03");
    expect(meses[18]).toBe("2026-09");
  });

  it("no pasa del fin del contrato", () => {
    expect(mesesTranscurridos({ ...base, inicioISO: "2026-06-01", plazoMeses: 2 })).toEqual(["2026-06", "2026-07"]);
  });

  it("con fechas incompletas no hay nada que decidir", () => {
    expect(mesesTranscurridos({ ...base, inicioISO: "" })).toEqual([]);
    expect(mesesTranscurridos({ ...base, plazoMeses: 0 })).toEqual([]);
  });
});

describe("periodosDelBackend", () => {
  it("lee la lista que manda el backend en errors.elapsed", () => {
    expect(periodosDelBackend({ elapsed: "2026-06, 2026-07" })).toEqual(["2026-06", "2026-07"]);
  });

  it("ignora lo que no tiene forma de mes, y sin lista devuelve null", () => {
    expect(periodosDelBackend({ elapsed: "basura" })).toBeNull();
    expect(periodosDelBackend(null)).toBeNull();
    expect(periodosDelBackend({})).toBeNull();
  });
});

describe("la respuesta y lo que se manda", () => {
  const meses = ["2026-06", "2026-07"];

  it("sin responder, no se manda nada y falta responder", () => {
    expect(paidThroughDe("", meses)).toBeUndefined();
    expect(faltaResponder("", meses)).toBe(true);
  });

  it("«Ninguno todavía» se manda como null, no como ausente", () => {
    expect(paidThroughDe(NINGUNO, meses)).toEqual({ paidThrough: null });
    expect(faltaResponder(NINGUNO, meses)).toBe(false);
  });

  it("un mes se manda tal cual", () => {
    expect(paidThroughDe("2026-07", meses)).toEqual({ paidThrough: "2026-07" });
  });

  it("sin cuotas transcurridas no hay nada que mandar ni que responder", () => {
    expect(paidThroughDe("", [])).toBeUndefined();
    expect(faltaResponder("", [])).toBe(false);
  });
});

describe("consecuenciaDe", () => {
  const meses = ["2026-06", "2026-07", "2026-08", "2026-09"];
  const entrada = { meses, inicioISO: "2026-06-01", alquiler: 450000, frecuenciaMeses: 12, tieneRecargo: true, hoyISO: "2026-10-10" };

  it("pagado hasta agosto, con punitorios: cobradas, deuda con total, aviso y recargo desde hoy", () => {
    const c = consecuenciaDe({ ...entrada, respuesta: "2026-08" });
    expect(c?.frases).toEqual([
      "Junio a agosto quedan como cobradas (sin comprobante).",
      "Septiembre queda como deuda: $ 450.000.",
      "Su inquilino va a recibir el aviso de cuota vencida.",
      "El recargo por atraso empieza a correr desde hoy.",
    ]);
    expect(c?.totalDeuda).toBe(450000);
  });

  it("sin punitorios no habla del recargo", () => {
    const c = consecuenciaDe({ ...entrada, respuesta: "2026-08", tieneRecargo: false });
    expect(c?.frases.join(" ")).not.toMatch(/recargo/);
  });

  it("«Ninguno todavía»: todo queda como deuda", () => {
    const c = consecuenciaDe({ ...entrada, respuesta: NINGUNO });
    expect(c?.frases).toEqual([
      "Ninguna cuota queda como cobrada.",
      "Junio a septiembre quedan como deuda: $ 1.800.000.",
      "Su inquilino va a recibir el aviso de cuota vencida.",
      "El recargo por atraso empieza a correr desde hoy.",
    ]);
  });

  it("pagado hasta el último mes: no hay deuda, ni aviso ni recargo", () => {
    const c = consecuenciaDe({ ...entrada, respuesta: "2026-09" });
    expect(c?.frases).toEqual(["Junio a septiembre quedan como cobradas (sin comprobante).", "No queda deuda."]);
    expect(c?.deuda).toEqual([]);
  });

  it("un solo mes cobrado va en singular", () => {
    const c = consecuenciaDe({ ...entrada, meses: ["2026-06", "2026-07"], respuesta: "2026-06" });
    expect(c?.frases[0]).toBe("Junio queda como cobrada (sin comprobante).");
  });

  it("si el mes adeudado ya es posterior al primer aumento, no se inventa un total", () => {
    // Con aumento cada 3 meses desde junio, septiembre ya paga el alquiler actualizado.
    const c = consecuenciaDe({ ...entrada, frecuenciaMeses: 3, respuesta: "2026-08" });
    expect(c?.totalDeuda).toBeNull();
    expect(c?.frases[1]).toBe("Septiembre queda como deuda.");
  });

  it("incluye el año cuando el rango no es del año en curso", () => {
    const c = consecuenciaDe({ ...entrada, meses: ["2025-11", "2025-12", "2026-01"], inicioISO: "2025-11-01", respuesta: "2026-01" });
    expect(c?.frases[0]).toBe("Noviembre 2025 a enero 2026 quedan como cobradas (sin comprobante).");
  });

  it("sin responder o sin meses transcurridos no hay consecuencia que mostrar", () => {
    expect(consecuenciaDe({ ...entrada, respuesta: "" })).toBeNull();
    expect(consecuenciaDe({ ...entrada, meses: [], respuesta: NINGUNO })).toBeNull();
  });
});
