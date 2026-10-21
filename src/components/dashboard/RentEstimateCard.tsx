"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import RentComparablesPanel from "@/components/dashboard/RentComparablesPanel";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { PriceConfidence, RentEstimate } from "@/lib/backend-types";
import { copyDeError } from "@/lib/error-codes";
import { formatearMonto } from "@/lib/formato";

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

export default function RentEstimateCard({ propertyId }: Readonly<{ propertyId: number }>) {
  const [estado, setEstado] = useState<Estado>("idle");
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
        AlquiaBackendClient.properties.getRentEstimate(propertyId),
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

  return (
    <div className="owner-card rent-estimate">
      <h2>Sugerir alquiler</h2>

      {estado === "idle" && (
        <>
          <p className="rent-estimate__lead">
            Estimá a cuánto alquilar esta propiedad según el mercado. Útil al terminar un contrato,
            para fijar el nuevo alquiler.
          </p>
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
            <b>{formatearMonto(estimate.estimatedMonthlyRent)}</b>
            <small>por mes</small>
          </p>
          <p className="rent-estimate__range">
            Rango estimado: {formatearMonto(estimate.range.low)} –{" "}
            {formatearMonto(estimate.range.high)}
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
            onClick={estimar}
          >
            Volver a estimar
          </button>
        </div>
      )}
    </div>
  );
}
