/**
 * Tutorial del primer ingreso (ALQ-21).
 *
 * No hay una librería de tours en el stack y el sistema de UI prefiere un
 * comportamiento propio antes que pelearse con el default de una. El estado
 * «ya lo vio» vive en el dispositivo: alcanza para no repetirlo en cada
 * ingreso y no pide nada al backend. Saltear y terminar se guardan igual;
 * volver a abrirlo desde el menú no borra esa marca.
 */

export const CLAVE_TUTORIAL = "alquia:tutorial";
export const TUTORIAL_ABRIR = "alquia:tutorial";

const ANCHO_TARJETA = 380;
const MARGEN = 16;

export type PasoDelTutorial = Readonly<{
  anclas: readonly string[];
  titulo: string;
  texto: string;
  etiqueta: string;
}>;

/**
 * El orden es el del alta unificada (ALQ-55): no se enseña a crear cada cosa
 * por su pantalla. Se señala dónde vive y que las tres entran por «Nuevo contrato».
 */
export const PASOS_DEL_TUTORIAL: readonly PasoDelTutorial[] = [
  {
    anclas: ["propiedad"],
    etiqueta: "Propiedad",
    titulo: "Primero, la propiedad",
    texto: "Para empezar a cobrar se carga una propiedad, después un inquilino y al final un contrato. La propiedad —dirección y tipo— es el primer paso. Entra en «Nuevo contrato» y después queda en Propiedades.",
  },
  {
    anclas: ["inquilino"],
    etiqueta: "Inquilino",
    titulo: "Después, el inquilino",
    texto: "El segundo paso es quien alquila. En el mismo asistente lo elige, si ya lo tiene, o lo carga en el momento. Después lo ve en Inquilinos.",
  },
  {
    anclas: ["nuevo-contrato", "contrato"],
    etiqueta: "Contrato",
    titulo: "Y cierra con el contrato",
    texto: "«Nuevo contrato» junta la propiedad y el inquilino: el alquiler, el plazo y cómo se actualiza. Recién al final se guarda todo junto.",
  },
];

export function tutorialYaVisto(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(CLAVE_TUTORIAL) === "visto";
  } catch {
    // Sin storage no hay cómo recordar el cierre: no se interrumpe cada ingreso.
    return true;
  }
}

export function marcarTutorialVisto(): void {
  try {
    window.localStorage.setItem(CLAVE_TUTORIAL, "visto");
  } catch {
    // Esta sesión igual lo cierra; el próximo ingreso puede volver a mostrarlo.
  }
}

export function abrirTutorial(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TUTORIAL_ABRIR));
}

type Caja = Readonly<{ top: number; right: number; bottom: number; left: number; width: number; height: number }>;

function estaEnPantalla(caja: Caja, viewport: { ancho: number; alto: number }): boolean {
  if (caja.width < 8 || caja.height < 8) return false;
  if (caja.bottom <= 0 || caja.right <= 0) return false;
  if (caja.top >= viewport.alto || caja.left >= viewport.ancho) return false;
  return true;
}

/** La primera ancla visible, en el orden en que el paso las prefiere. */
export function anclaVisible(anclas: readonly string[]): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const viewport = { ancho: window.innerWidth, alto: window.innerHeight };
  for (const nombre of anclas) {
    for (const nodo of document.querySelectorAll<HTMLElement>(`[data-tutorial="${nombre}"]`)) {
      if (estaEnPantalla(nodo.getBoundingClientRect(), viewport)) return nodo;
    }
  }
  return null;
}

/**
 * La tarjeta queda al lado del control señalado. Si no entra a la derecha,
 * baja; si tampoco entra abajo, sube. Sin ancla, queda centrada.
 */
export function ubicarTarjeta(
  rect: Caja | null,
  alto: number,
  viewport: { ancho: number; alto: number },
): { top: number; left: number; width: number } {
  const width = Math.min(ANCHO_TARJETA, Math.max(0, viewport.ancho - MARGEN * 2));
  if (!rect) {
    return {
      top: Math.max(MARGEN, (viewport.alto - alto) / 2),
      left: Math.max(MARGEN, (viewport.ancho - width) / 2),
      width,
    };
  }

  let left = rect.right + 14;
  let top = rect.top;
  if (left + width > viewport.ancho - MARGEN) {
    left = rect.left;
    top = rect.bottom + 14;
  }
  if (top + alto > viewport.alto - MARGEN) {
    const arriba = rect.top - alto - 14;
    top = arriba >= MARGEN ? arriba : MARGEN;
  }
  if (left + width > viewport.ancho - MARGEN) {
    left = viewport.ancho - MARGEN - width;
  }
  return { top: Math.max(MARGEN, top), left: Math.max(MARGEN, left), width };
}
