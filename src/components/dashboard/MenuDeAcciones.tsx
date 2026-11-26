"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";

export type AccionDelMenu = {
  clave: string;
  texto: string;
  deshabilitada?: boolean;
  alElegir: () => void | Promise<unknown>;
};

type Posicion = { right: number; top?: number; bottom?: number };

const ALTO_DE_OPCION = 44;
const AIRE = 6;

/**
 * El menú sale de la tabla: `.owner-table-wrap` recorta lo que se pasa de su
 * borde, así que va a `document.body` con `position: fixed`, anclado al botón.
 * Se abre hacia abajo salvo que no entre y arriba sí.
 */
function posicionDelMenu(ancla: DOMRect, cantidad: number): Posicion {
  const alto = cantidad * ALTO_DE_OPCION + AIRE * 2 + 4;
  const right = Math.max(8, window.innerWidth - ancla.right);
  const entraAbajo = ancla.bottom + AIRE + alto <= window.innerHeight;
  const entraArriba = ancla.top - AIRE - alto >= 0;
  if (!entraAbajo && entraArriba) return { right, bottom: window.innerHeight - ancla.top + AIRE };
  return { right, top: ancla.bottom + AIRE };
}

function opcionesHabilitadas(menu: HTMLElement | null): HTMLButtonElement[] {
  if (!menu) return [];
  return Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'));
}

function indiceDeDestino(tecla: string, actual: number, cantidad: number): number {
  if (tecla === "Home") return 0;
  if (tecla === "End") return cantidad - 1;
  if (tecla === "ArrowDown") return (actual + 1) % cantidad;
  return actual < 0 ? cantidad - 1 : (actual - 1 + cantidad) % cantidad;
}

function moverElFoco(menu: HTMLElement | null, tecla: string) {
  const opciones = opcionesHabilitadas(menu);
  if (opciones.length === 0) return;
  const actual = opciones.findIndex((opcion) => opcion === document.activeElement);
  opciones[indiceDeDestino(tecla, actual, opciones.length)].focus();
}

function seMovio(antes: DOMRect | null, ahora: DOMRect | undefined): boolean {
  if (!antes || !ahora) return true;
  return Math.abs(ahora.top - antes.top) > 1 || Math.abs(ahora.left - antes.left) > 1;
}

const TECLAS_DE_MOVIMIENTO = new Set(["ArrowDown", "ArrowUp", "Home", "End"]);

type RefsDelMenu = {
  abierto: boolean;
  menu: React.RefObject<HTMLDivElement | null>;
  boton: React.RefObject<HTMLButtonElement | null>;
  anclaAlAbrir: React.RefObject<DOMRect | null>;
  cerrar: () => void;
};

/**
 * Mientras el menú está abierto: el foco entra a la primera opción y se cierra con
 * un toque afuera, con Escape (devolviendo el foco al botón), al cambiar el
 * tamaño de la ventana o si la página se desplaza y el botón se movió.
 */
function useCierreDelMenu({ abierto, menu, boton, anclaAlAbrir, cerrar }: RefsDelMenu) {
  useEffect(() => {
    if (abierto) opcionesHabilitadas(menu.current)[0]?.focus({ preventScroll: true });
  }, [abierto, menu]);

  useEffect(() => {
    if (!abierto) return;
    const alTocarAfuera = (evento: PointerEvent) => {
      const blanco = evento.target as Node;
      if (!menu.current?.contains(blanco) && !boton.current?.contains(blanco)) cerrar();
    };
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      cerrar();
      boton.current?.focus();
    };
    // El menú es fijo: si el botón se movió, el menú quedaría flotando donde no corresponde.
    const alDesplazar = () => {
      if (seMovio(anclaAlAbrir.current, boton.current?.getBoundingClientRect())) cerrar();
    };
    document.addEventListener("pointerdown", alTocarAfuera);
    document.addEventListener("keydown", alTeclear);
    window.addEventListener("scroll", alDesplazar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("pointerdown", alTocarAfuera);
      document.removeEventListener("keydown", alTeclear);
      window.removeEventListener("scroll", alDesplazar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [abierto, menu, boton, anclaAlAbrir, cerrar]);
}

/**
 * El botón «⋯» de una fila y su menú de acciones secundarias. Sin acciones no
 * dibuja el botón pero deja su lugar, para que las columnas de la tabla no
 * salten de una fila a otra.
 *
 * Teclado: Enter, Espacio o flecha abajo abren; las flechas, Inicio y Fin
 * mueven el foco; Escape o Tab cierran y devuelven el foco al botón.
 * Un clic afuera también cierra.
 */
export function MenuDeAcciones({ etiqueta, acciones }: Readonly<{ etiqueta: string; acciones: AccionDelMenu[] }>) {
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [pendiente, setPendiente] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const anclaAlAbrir = useRef<DOMRect | null>(null);
  const abierto = posicion !== null;
  const cerrar = useCallback(() => setPosicion(null), []);

  useCierreDelMenu({ abierto, menu, boton, anclaAlAbrir, cerrar });

  if (acciones.length === 0) return <span className="owner-more owner-more--hueco" aria-hidden="true" />;

  function abrir() {
    if (!boton.current) return;
    anclaAlAbrir.current = boton.current.getBoundingClientRect();
    setPosicion(posicionDelMenu(anclaAlAbrir.current, acciones.length));
  }

  function cerrarYVolver() {
    setPosicion(null);
    boton.current?.focus();
  }

  function elegir(accion: AccionDelMenu) {
    // El foco vuelve al botón antes de actuar: si la acción abre un diálogo, al cerrarlo el foco tiene adónde volver.
    cerrarYVolver();
    const resultado = accion.alElegir();
    // Una acción larga (bajar un PDF) se ve en el botón: el menú ya se cerró.
    if (resultado instanceof Promise) {
      setPendiente(true);
      void resultado.finally(() => setPendiente(false));
    }
  }

  function alTeclearEnElBoton(evento: React.KeyboardEvent) {
    if (evento.key !== "ArrowDown") return;
    evento.preventDefault();
    abrir();
  }

  function alTeclearEnElMenu(evento: React.KeyboardEvent) {
    if (evento.key === "Tab") {
      evento.preventDefault();
      cerrarYVolver();
    } else if (TECLAS_DE_MOVIMIENTO.has(evento.key)) {
      evento.preventDefault();
      moverElFoco(menu.current, evento.key);
    }
  }

  return <>
    <button ref={boton} type="button" className="owner-more" aria-label={etiqueta} aria-haspopup="menu" aria-expanded={abierto} aria-busy={pendiente || undefined}
      onClick={() => (abierto || pendiente ? cerrarYVolver() : abrir())} onKeyDown={alTeclearEnElBoton}>
      {pendiente ? <Spinner /> : <Icon name="more" size={18} />}
    </button>
    {posicion && createPortal(
      <div ref={menu} role="menu" aria-label="Más acciones" className="owner-menu" style={posicion} onKeyDown={alTeclearEnElMenu}>
        {acciones.map((accion) => (
          <button key={accion.clave} type="button" role="menuitem" className="owner-menu__item" disabled={accion.deshabilitada} onClick={() => elegir(accion)}>
            {accion.texto}
          </button>
        ))}
      </div>,
      document.body,
    )}
  </>;
}
