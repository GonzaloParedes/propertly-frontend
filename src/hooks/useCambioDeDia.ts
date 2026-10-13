"use client";

import { useEffect, useRef } from "react";
import { hoyEnArgentina } from "@/lib/formato";

const CADA_CUANTO_MIRAR_MS = 30_000;

/**
 * Avisa cuando cambia el día en Argentina mientras la pantalla sigue abierta.
 * El recargo por atraso crece a la medianoche argentina y el backend lo calcula
 * al leer, así que una pantalla que quedó abierta muestra el importe de ayer
 * hasta que alguien la recargue.
 *
 * Compara fechas en vez de agendar un único timeout hasta la medianoche: una
 * pestaña dormida o una notebook suspendida no ejecutan sus timers a tiempo, y
 * al volver (`visibilitychange`) esta comparación igual se da cuenta.
 */
export function useCambioDeDia({ activo, alCambiar }: Readonly<{
  /** Sólo se vigila el día si hay algo en pantalla que dependa de él. */
  activo: boolean;
  alCambiar: () => void;
}>) {
  const ultima = useRef(alCambiar);
  useEffect(() => {
    ultima.current = alCambiar;
  });

  useEffect(() => {
    if (!activo) return;
    let dia = hoyEnArgentina();
    function revisar() {
      const hoy = hoyEnArgentina();
      if (hoy === dia) return;
      dia = hoy;
      ultima.current();
    }
    const intervalo = setInterval(revisar, CADA_CUANTO_MIRAR_MS);
    document.addEventListener("visibilitychange", revisar);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", revisar);
    };
  }, [activo]);
}
