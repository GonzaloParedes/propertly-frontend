import {
  CLAVE_TUTORIAL,
  PASOS_DEL_TUTORIAL,
  anclaVisible,
  marcarTutorialVisto,
  tutorialYaVisto,
  ubicarTarjeta,
} from "@/lib/tutorial";

function caja(parcial: Partial<DOMRect>): DOMRect {
  return {
    x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() {},
    ...parcial,
  } as DOMRect;
}

beforeEach(() => {
  window.localStorage.removeItem(CLAVE_TUTORIAL);
  document.body.replaceChildren();
});

describe("marca de ya visto", () => {
  it("un ingreso nuevo todavía no lo vio", () => {
    expect(tutorialYaVisto()).toBe(false);
  });

  it("saltear o terminar lo deja marcado", () => {
    marcarTutorialVisto();
    expect(tutorialYaVisto()).toBe(true);
    expect(window.localStorage.getItem(CLAVE_TUTORIAL)).toBe("visto");
  });
});

describe("los tres pasos", () => {
  it("siguen el orden propiedad, inquilino, contrato", () => {
    expect(PASOS_DEL_TUTORIAL.map((paso) => paso.etiqueta)).toEqual([
      "Propiedad",
      "Inquilino",
      "Contrato",
    ]);
    expect(PASOS_DEL_TUTORIAL[2].anclas).toEqual(["nuevo-contrato", "contrato"]);
  });
});

describe("ancla visible", () => {
  it("prefiere la primera ancla que está en pantalla", () => {
    const tapado = document.createElement("button");
    tapado.dataset.tutorial = "nuevo-contrato";
    const menu = document.createElement("a");
    menu.dataset.tutorial = "contrato";
    document.body.append(tapado, menu);
    vi.spyOn(tapado, "getBoundingClientRect").mockReturnValue(caja({ top: 40, left: -400, right: -200, bottom: 80, width: 200, height: 40 }));
    vi.spyOn(menu, "getBoundingClientRect").mockReturnValue(caja({ top: 80, left: 16, right: 180, bottom: 120, width: 164, height: 40 }));

    expect(anclaVisible(["nuevo-contrato", "contrato"])).toBe(menu);
  });

  it("ignora un control sin tamaño, como el menú de celular cerrado", () => {
    const oculto = document.createElement("a");
    oculto.dataset.tutorial = "propiedad";
    document.body.append(oculto);
    vi.spyOn(oculto, "getBoundingClientRect").mockReturnValue(caja({}));

    expect(anclaVisible(["propiedad"])).toBeNull();
  });
});

describe("ubicación de la tarjeta", () => {
  const viewport = { ancho: 1200, alto: 800 };

  it("sin ancla queda centrada", () => {
    expect(ubicarTarjeta(null, 280, viewport)).toEqual({ top: 260, left: 410, width: 380 });
  });

  it("a un ítem del menú la pone a la derecha", () => {
    const lugar = ubicarTarjeta(
      { top: 120, right: 220, bottom: 160, left: 20, width: 200, height: 40 },
      280,
      viewport,
    );
    expect(lugar.left).toBe(234);
    expect(lugar.top).toBe(120);
  });

  it("si no entra abajo, la sube", () => {
    const lugar = ubicarTarjeta(
      { top: 700, right: 900, bottom: 748, left: 700, width: 200, height: 48 },
      280,
      viewport,
    );
    expect(lugar.top).toBe(700 - 280 - 14);
  });
});
