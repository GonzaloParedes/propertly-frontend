"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import RentComparablesPanel from "@/components/dashboard/RentComparablesPanel";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { Currency, PriceConfidence, RentEstimate } from "@/lib/backend-types";
import { copyDeError } from "@/lib/error-codes";
import { formatearImporte } from "@/lib/formato";

/**
 * Botón «Sugerir alquiler» en el detalle de una propiedad (ALQ-45). Pide la
 * estimación al backend (`properties.getRentEstimate`) y, mientras llega,
 * muestra un spinner con un simple «Estimando…»; al terminar el spinner se
 * convierte en un check. El resultado muestra el monto, su rango, cuántos
 * comparables se consideraron y un aviso de que es una estimación.
 *
 * Hay un piso de tiempo (`MIN_MS`) para que el estado de carga no parpadee
 * cuando el backend contesta al instante.
 */

const MIN_MS = 2200;

const FALLBACK_MSG = "No pudimos estimar el alquiler ahora. Probá de nuevo en un momento.";

const CONFIANZA: Record<PriceConfidence, { label: string; mod: string }> = {
  HIGH: { label: "Confianza alta", mod: "alta" },
  MEDIUM: { label: "Confianza media", mod: "media" },
  LOW: { label: "Confianza baja", mod: "baja" },
};

type Estado = "idle" | "loading" | "done" | "error";

// La moneda se elige antes de estimar: el backend calcula la predicción en la
// moneda pedida (`?currency=`), así que no es una conversión en el front.
const MONEDAS: ReadonlyArray<readonly [Currency, string]> = [
  ["ARS", "En pesos"],
  ["USD", "En dólares"],
];

export default function RentEstimateCard({ propertyId }: Readonly<{ propertyId: number }>) {
  const [estado, setEstado] = useState<Estado>("idle");
  const [moneda, setMoneda] = useState<Currency>("ARS");
  const [estimate, setEstimate] = useState<RentEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timeouts = useRef<number[]>([]);
  const montado = useRef(true);

  useEffect(() => {
    // Se resetea a true en el cuerpo (no solo se apaga en el cleanup): en dev,
    // React Strict Mode monta → desmonta → remonta, y sin esto el ref quedaría
    // en false tras el primer desmontaje y las fases/el resultado nunca se verían.
    montado.current = true;
    return () => {
      montado.current = false;
      timeouts.current.forEach(clearTimeout);
    };
  }, []);

  async function estimar() {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    setEstado("loading");
    setError(null);

    try {
      const piso = new Promise<void>((resolve) => {
        timeouts.current.push(window.setTimeout(resolve, MIN_MS));
      });
      const [data] = await Promise.all([
        AlquiaBackendClient.properties.getRentEstimate(propertyId, moneda),
        piso,
      ]);
      if (!montado.current) return;
      setEstimate(data);
      setEstado("done");
    } catch (e) {
      if (!montado.current) return;
      setError(copyDeError(e, { fallback: FALLBACK_MSG }));
      setEstado("error");
    }
  }

  // Vuelve al inicio (con el toggle de moneda) para poder elegir otra moneda y
  // estimar de nuevo, en vez de repetir el pedido con la moneda anterior.
  function volver() {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    setEstimate(null);
    setError(null);
    setEstado("idle");
  }

  return (
    <div className="owner-card rent-estimate">
      <h2>Sugerir alquiler</h2>

      {estado === "idle" && (
        <>
          <p className="rent-estimate__lead">
            Estimá a cuánto alquilar esta propiedad según el mercado. Útil al terminar un contrato,
            para fijar el nuevo alquiler.
          </p>
          <p className="owner-eyebrow rent-estimate__moneda-label">MONEDA</p>
          <fieldset className="owner-fieldset owner-wizard-chips rent-estimate__moneda">
            <legend className="sr-only">Moneda de la estimación</legend>
            {MONEDAS.map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={moneda === valor}
                onClick={() => setMoneda(valor)}
              >
                {etiqueta}
              </button>
            ))}
          </fieldset>
          <button type="button" className="owner-button owner-button--secondary" onClick={estimar}>
            <Icon name="trend" size={18} />
            Sugerir alquiler
          </button>
        </>
      )}

      {estado === "loading" && (
        <output className="rent-estimate__progress" aria-live="polite">
          <Spinner size="md" />
          <span>Estimando…</span>
        </output>
      )}

      {estado === "error" && (
        <div className="rent-estimate__error">
          <p>{error}</p>
          <button type="button" className="owner-button owner-button--secondary" onClick={estimar}>
            <Icon name="trend" size={18} />
            Reintentar
          </button>
        </div>
      )}

      {estado === "done" && estimate && (
        <div className="rent-estimate__result">
          <p className="rent-estimate__ready">
            <span className="rent-estimate__check">
              <Icon name="check" size={18} />
            </span>{" "}
            Predicción lista.
          </p>
          <p className="owner-eyebrow">ALQUILER SUGERIDO</p>
          <p className="rent-estimate__amount">
            <b>{formatearImporte(estimate.estimatedMonthlyRent, estimate.currency)}</b>
            <small>por mes</small>
          </p>
          <p className="rent-estimate__range">
            Rango estimado: {formatearImporte(estimate.range.low, estimate.currency)} –{" "}
            {formatearImporte(estimate.range.high, estimate.currency)}
          </p>
          <p className="rent-estimate__basis">
            Basado en {estimate.listingsConsidered} propiedades del mercado
          </p>
          <span
            className={`rent-estimate__confidence rent-estimate__confidence--${CONFIANZA[estimate.confidence].mod}`}
          >
            {CONFIANZA[estimate.confidence].label}
          </span>
          <p className="rent-estimate__disclaimer">
            <Info size={15} aria-hidden="true" />
            Es un valor estimado y puede tener margen de error. Usalo como referencia, no como precio
            definitivo.
          </p>
          {/* subjectLocation se asume siempre presente (lo garantiza ALQ-92); si
              faltara, el mapa falla a propósito en vez de dibujar un estado vacío. */}
          <RentComparablesPanel
            subject={estimate.subjectLocation!}
            listings={estimate.listings}
            tileStyle="alquia"
          />
          <button
            type="button"
            className="owner-button owner-button--quiet owner-button--small"
            onClick={volver}
          >
            Volver a estimar
          </button>
        </div>
      )}
    </div>
  );
}
