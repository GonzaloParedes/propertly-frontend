"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  PASOS_DEL_TUTORIAL,
  TUTORIAL_ABRIR,
  anclaVisible,
  marcarTutorialVisto,
  tutorialYaVisto,
  ubicarTarjeta,
} from "@/lib/tutorial";

const ALTO_ESTIMADO = 280;

/**
 * Guía de primer ingreso. `auto` la abre sola si todavía no se vio ni se
 * salteó. En el panel real se monta recién con la sesión, así que el estado
 * inicial ya corre en el cliente y puede leer localStorage. El menú y
 * Configuración la vuelven a abrir con el evento `alquia:tutorial`.
 */
export default function Tutorial({ auto = false }: Readonly<{ auto?: boolean }>) {
  const [abierto, setAbierto] = useState(() => auto && !tutorialYaVisto());
  const [paso, setPaso] = useState(0);
  const raizRef = useRef<HTMLDivElement>(null);
  const focoRef = useRef<HTMLDivElement>(null);
  const tarjetaRef = useRef<HTMLDivElement>(null);
  const seguirRef = useRef<HTMLButtonElement>(null);
  const actual = PASOS_DEL_TUTORIAL[paso];
  const esUltimo = paso === PASOS_DEL_TUTORIAL.length - 1;

  const cerrar = useCallback((recordar: boolean) => {
    if (recordar) marcarTutorialVisto();
    setAbierto(false);
  }, []);

  const medir = useCallback((traerAVista: boolean) => {
    const nodo = anclaVisible(actual.anclas);
    if (traerAVista) nodo?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    const rect = nodo?.getBoundingClientRect() ?? null;
    const foco = focoRef.current;
    const tarjeta = tarjetaRef.current;
    if (!foco || !tarjeta) return;

    if (rect) {
      const pad = 6;
      foco.hidden = false;
      foco.style.top = `${rect.top - pad}px`;
      foco.style.left = `${rect.left - pad}px`;
      foco.style.width = `${rect.width + pad * 2}px`;
      foco.style.height = `${rect.height + pad * 2}px`;
    } else {
      foco.hidden = true;
    }
    raizRef.current?.classList.toggle("owner-tutorial--con-foco", rect !== null);

    const alto = tarjeta.offsetHeight || ALTO_ESTIMADO;
    const lugar = ubicarTarjeta(rect, alto, { ancho: window.innerWidth, alto: window.innerHeight });
    tarjeta.style.top = `${lugar.top}px`;
    tarjeta.style.left = `${lugar.left}px`;
    tarjeta.style.width = `${lugar.width}px`;
    tarjeta.style.transform = "none";
  }, [actual]);

  useEffect(() => {
    const abrir = () => {
      setPaso(0);
      setAbierto(true);
    };
    window.addEventListener(TUTORIAL_ABRIR, abrir);
    return () => window.removeEventListener(TUTORIAL_ABRIR, abrir);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    seguirRef.current?.focus();
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [abierto, paso]);

  useEffect(() => {
    if (!abierto) return;
    const alSalir = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cerrar(true);
      }
    };
    window.addEventListener("keydown", alSalir);
    return () => window.removeEventListener("keydown", alSalir);
  }, [abierto, cerrar]);

  useLayoutEffect(() => {
    if (!abierto) return;
    medir(true);
  }, [abierto, medir]);

  useEffect(() => {
    if (!abierto) return;
    const alMover = () => medir(false);
    window.addEventListener("resize", alMover);
    window.addEventListener("scroll", alMover, true);
    return () => {
      window.removeEventListener("resize", alMover);
      window.removeEventListener("scroll", alMover, true);
    };
  }, [abierto, medir]);

  if (!abierto) return null;

  function atraparTab(event: React.KeyboardEvent) {
    if (event.key !== "Tab") return;
    const focos = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled)")];
    const primero = focos[0];
    const ultimo = focos[focos.length - 1];
    if (!primero || !ultimo) return;
    if (event.shiftKey && document.activeElement === primero) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primero.focus();
    }
  }

  return (
    <div
      ref={raizRef}
      className="owner-tutorial"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-titulo"
      aria-describedby="tutorial-texto"
      onKeyDown={atraparTab}
    >
      <div className="owner-tutorial__velo" onClick={() => cerrar(true)} />
      <div ref={focoRef} className="owner-tutorial__foco" hidden aria-hidden="true" />
      <div ref={tarjetaRef} className="owner-tutorial__tarjeta">
        <p className="owner-eyebrow">Paso {paso + 1} de {PASOS_DEL_TUTORIAL.length}</p>
        <div aria-live="polite">
          <h2 id="tutorial-titulo">{actual.titulo}</h2>
          <p id="tutorial-texto">{actual.texto}</p>
        </div>
        <ol className="owner-tutorial__recorrido">
          {PASOS_DEL_TUTORIAL.map((item, indice) => (
            <li key={item.etiqueta} data-actual={indice === paso ? "" : undefined}>
              <span>{indice + 1}</span>{item.etiqueta}
            </li>
          ))}
        </ol>
        <div className="owner-tutorial__acciones">
          <button type="button" className="owner-button owner-button--quiet" onClick={() => cerrar(true)}>Saltear</button>
          {paso > 0 && (
            <button type="button" className="owner-button owner-button--secondary" onClick={() => setPaso((n) => n - 1)}>Atrás</button>
          )}
          <button
            ref={seguirRef}
            type="button"
            className="owner-button"
            onClick={() => (esUltimo ? cerrar(true) : setPaso((n) => n + 1))}
          >
            {esUltimo ? "Entendido" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
