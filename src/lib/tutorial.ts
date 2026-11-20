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

const SEPARACION = 14;
/** Debajo de esto la tarjeta ya no se puede leer: mejor que tape el control. */
const ALTO_MINIMO = 180;
const ANCHO_MINIMO = 280;

export type LugarDeTarjeta = Readonly<{
  top: number;
  left: number;
  width: number;
  /** Alto disponible. Si es menor que el de la tarjeta, la tarjeta se desplaza adentro. */
  maxHeight: number;
  /** La tarjeta no entra entera sin tapar el control señalado. */
  recortada: boolean;
}>;

function entre(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), Math.max(minimo, maximo));
}

/**
 * La tarjeta queda al lado del control señalado. Si no entra a la derecha,
 * baja; si tampoco entra abajo, sube; si tampoco, va a un costado más angosta.
 * En un celular puede no entrar entera en ningún lado: entonces va del lado con
 * más lugar y se achica, pero nunca tapa el control. Sin ancla, queda centrada.
 */
export function ubicarTarjeta(
  rect: Caja | null,
  alto: number,
  viewport: { ancho: number; alto: number },
): LugarDeTarjeta {
  const width = Math.min(ANCHO_TARJETA, Math.max(0, viewport.ancho - MARGEN * 2));
  const altoUtil = Math.max(0, viewport.alto - MARGEN * 2);
  if (!rect) {
    return {
      top: Math.max(MARGEN, (viewport.alto - alto) / 2),
      left: Math.max(MARGEN, (viewport.ancho - width) / 2),
      width,
      maxHeight: altoUtil,
      recortada: false,
    };
  }

  const aLaDerecha = rect.right + SEPARACION;
  if (aLaDerecha + width <= viewport.ancho - MARGEN) {
    return {
      top: entre(rect.top, MARGEN, viewport.alto - MARGEN - alto),
      left: aLaDerecha,
      width,
      maxHeight: altoUtil,
      recortada: false,
    };
  }

  const left = entre(rect.left, MARGEN, viewport.ancho - MARGEN - width);
  const abajo = rect.bottom + SEPARACION;
  const lugarAbajo = viewport.alto - MARGEN - abajo;
  const lugarArriba = rect.top - SEPARACION - MARGEN;

  if (alto <= lugarAbajo) return { top: abajo, left, width, maxHeight: lugarAbajo, recortada: false };
  if (alto <= lugarArriba) {
    return { top: rect.top - SEPARACION - alto, left, width, maxHeight: lugarArriba, recortada: false };
  }

  // Celular apaisado: no hay alto, pero sí ancho al costado para una tarjeta más angosta.
  const lugarDerecha = viewport.ancho - MARGEN - aLaDerecha;
  const lugarIzquierda = rect.left - SEPARACION - MARGEN;
  const costado = Math.max(lugarDerecha, lugarIzquierda);
  if (costado >= ANCHO_MINIMO) {
    const angosta = Math.min(width, costado);
    return {
      top: entre(rect.top, MARGEN, viewport.alto - MARGEN - alto),
      left: lugarDerecha >= lugarIzquierda ? aLaDerecha : rect.left - SEPARACION - angosta,
      width: angosta,
      maxHeight: altoUtil,
      recortada: false,
    };
  }

  const mayor = Math.max(lugarAbajo, lugarArriba);
  if (mayor < ALTO_MINIMO) {
    return { top: MARGEN, left, width, maxHeight: altoUtil, recortada: true };
  }
  return lugarAbajo >= lugarArriba
    ? { top: abajo, left, width, maxHeight: lugarAbajo, recortada: true }
    : { top: MARGEN, left, width, maxHeight: lugarArriba, recortada: true };
}
