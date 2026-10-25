"use client";

import { useEffect, useRef } from "react";
import { apiUrl } from "@/lib/api";

/** Lo que el back manda con `payment-updated`. Sin montos ni datos personales. */
export type EventoDePago = {
  paymentId: number;
  invoiceId: number;
  contractId: number;
  status: "AWAITING_CONFIRMATION" | "CONFIRMED" | "REJECTED";
};

type Opciones = {
  /** Ruta del stream (`/payments/events` o `/tenant/payments/events`). `null` = no conectar. */
  ruta: string | null;
  /** Al conectarse o reconectarse: los eventos perdidos no se reenvían, así que hay que volver a cargar. */
  onConectada: () => void;
  onPagoActualizado: (evento: EventoDePago) => void;
  /** Intenta renovar la sesión antes de reconectar. Sin esto, el stream se rinde al primer 401. */
  renovarSesion?: () => Promise<boolean>;
  /** El stream no puede seguir. La pantalla decide, por el flujo que ya existe, qué mostrar. */
  onSesionPerdida: () => void;
};

/**
 * Mantiene abierto el stream de eventos de pagos mientras `ruta` no sea null.
 *
 * El navegador reconecta solo cuando la conexión se corta o el servidor la cierra
 * por tiempo. Sólo hay que intervenir en dos casos: `replaced` (el servidor
 * desplazó esta pestaña por el límite de streams: no se reconecta, porque volver
 * desplazaría a la otra) y un cierre definitivo del navegador (un 401).
 */
export function usePaymentEvents(opciones: Opciones) {
  // Las funciones de la pantalla cambian en cada render; el stream no debe
  // reconectarse por eso, así que siempre se llama a la versión más reciente.
  const ultimas = useRef(opciones);
  useEffect(() => {
    ultimas.current = opciones;
  });

  const { ruta } = opciones;

  useEffect(() => {
    if (!ruta || typeof EventSource === "undefined") return;
    let montado = true;
    let fuente: EventSource | null = null;

    function conectar() {
      if (!montado || !ruta) return;
      const nueva = new EventSource(apiUrl(ruta), { withCredentials: true });
      fuente = nueva;

      nueva.addEventListener("connected", () => ultimas.current.onConectada());
      nueva.addEventListener("payment-updated", (mensaje) => {
        try {
          ultimas.current.onPagoActualizado(JSON.parse((mensaje as MessageEvent<string>).data) as EventoDePago);
        } catch {
          // Un evento que no se puede leer no justifica romper la pantalla: el próximo connected recarga todo.
        }
      });
      nueva.addEventListener("replaced", () => {
        // close() no dispara onerror: no hace falta una bandera para esta pestaña.
        nueva.close();
      });
      nueva.onerror = () => {
        // Un error transitorio lo reintenta el navegador solo (CONNECTING). Sólo CLOSED es definitivo.
        if (!montado || nueva.readyState !== EventSource.CLOSED) return;
        void recuperar();
      };
    }

    async function recuperar() {
      const renovada = ultimas.current.renovarSesion ? await ultimas.current.renovarSesion() : false;
      // Si la pantalla se desmontó mientras tanto, no hay a quién reconectar.
      if (!montado) return;
      if (renovada) {
        conectar();
        return;
      }
      ultimas.current.onSesionPerdida();
    }

    conectar();
    return () => {
      montado = false;
      fuente?.close();
    };
  }, [ruta]);
}
