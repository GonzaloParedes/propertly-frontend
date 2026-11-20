"use client";

import { useEffect, useState } from "react";
import AddressField from "@/components/dashboard/AddressField";
import RentEstimateCard from "@/components/dashboard/RentEstimateCard";
import Counter from "@/components/ui/Counter";
import { Cargando } from "@/components/ui/Spinner";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { Currency, PropertyResponse } from "@/lib/backend-types";

const DEMO_PROPIEDADES: PropertyResponse[] = [
  { id: 1, street: "Av. Rivadavia", number: "2340", floorUnit: "5.º A", city: "CABA", province: "Buenos Aires", latitude: -34.6168, longitude: -58.4166, bedrooms: 2, bathrooms: 1, coveredArea: 68, category: "APARTMENT", activeContract: null },
  { id: 2, street: "Lavalle", number: "950", floorUnit: "3.º B", city: "CABA", province: "Buenos Aires", latitude: -34.6029, longitude: -58.3817, bedrooms: 1, bathrooms: 1, coveredArea: 54, category: "APARTMENT", activeContract: null },
  { id: 3, street: "Colón", number: "2255", floorUnit: "4.º D", city: "Vicente López", province: "Buenos Aires", latitude: -34.5241, longitude: -58.4754, bedrooms: 2, bathrooms: 1, coveredArea: 58, category: "APARTMENT", activeContract: null },
  { id: 4, street: "Belgrano", number: "445", floorUnit: "PB", city: "Morón", province: "Buenos Aires", latitude: -34.6490, longitude: -58.6218, bedrooms: 3, bathrooms: 2, coveredArea: 92, category: "HOUSE", activeContract: null },
  { id: 5, street: "Mitre", number: "78", city: "San Isidro", province: "Buenos Aires", latitude: -34.4731, longitude: -58.5157, bedrooms: 0, coveredArea: 52, category: "COMMERCIAL_PREMISES", activeContract: null },
];
import type { Direccion } from "@/lib/borradores";
import { formatearDireccion } from "@/lib/formato";

type Modo = "propiedad" | "rapida";

export interface CargaRapida {
  direccion: Direccion | null;
  dormitorios: number;
  banos: number;
  metros: string;
}

const CARGA_INICIAL: CargaRapida = { direccion: null, dormitorios: 1, banos: 1, metros: "" };

/** Qué le falta a la carga rápida para poder estimar; `null` si está completa. */
export function faltanteDeLaCarga(carga: CargaRapida): string | null {
  if (!carga.direccion) return "Elija la dirección de la propiedad.";
  if (carga.direccion.latitude == null || carga.direccion.longitude == null) {
    return "Elija una dirección de la lista: sin su ubicación no se puede comparar con el mercado.";
  }
  if (!(Number(carga.metros) > 0)) return "Ingrese los metros cubiertos.";
  return null;
}

/**
 * El predictor de alquiler en Herramientas (ALQ-145): para una propiedad cargada usa
 * `/properties/{id}/rent-estimate`; para otra, una carga rápida (dirección, dormitorios,
 * baños y metros) contra `/tools/rent-estimate`. El resultado es la misma tarjeta del
 * detalle de la propiedad.
 */
export default function PredictorDeAlquiler({ demo = false }: Readonly<{ demo?: boolean }>) {
  // En el prototipo no hay sesión: no hay propiedades que traer.
  const [propiedades, setPropiedades] = useState<PropertyResponse[] | null>(demo ? DEMO_PROPIEDADES : null);
  const [modo, setModo] = useState<Modo | null>(null);
  const [elegida, setElegida] = useState<number | null>(null);
  const [carga, setCarga] = useState<CargaRapida>(CARGA_INICIAL);

  useEffect(() => {
    if (demo) return;
    let vigente = true;
    AlquiaBackendClient.properties.list()
      .then((lista) => vigente && setPropiedades(lista))
      .catch(() => vigente && setPropiedades([]));
    return () => { vigente = false; };
  }, [demo]);

  // Sin propiedades cargadas no hay nada que elegir: se arranca por la carga rápida.
  const modoActual: Modo = modo ?? (propiedades !== null && propiedades.length > 0 ? "propiedad" : "rapida");
  const cambiarCarga = (cambios: Partial<CargaRapida>) => setCarga((actual) => ({ ...actual, ...cambios }));
  const faltante = faltanteDeLaCarga(carga);

  function estimarCarga(moneda: Currency) {
    const { direccion } = carga;
    return AlquiaBackendClient.tools.rentEstimate({
      city: direccion?.city || null,
      province: direccion?.province || null,
      latitude: direccion!.latitude!,
      longitude: direccion!.longitude!,
      bedrooms: carga.dormitorios,
      bathrooms: carga.banos,
      coveredArea: Number(carga.metros),
      currency: moneda,
    });
  }

  // Hasta que llega la lista no se sabe si arrancar por sus propiedades o por la carga
  // rápida: mostrar la carga rápida y después cambiarla hace saltar la pantalla.
  if (propiedades === null) return <div className="owner-card"><Cargando>Cargando sus propiedades…</Cargando></div>;

  return <>
    {propiedades.length > 0 && (
      <div className="owner-wizard-chips owner-tool__modos" role="group" aria-label="Qué propiedad estimar">
        <button type="button" aria-pressed={modoActual === "propiedad"} onClick={() => setModo("propiedad")}>Una propiedad suya</button>
        <button type="button" aria-pressed={modoActual === "rapida"} onClick={() => setModo("rapida")}>Otra propiedad</button>
      </div>
    )}

    {modoActual === "propiedad" && <>
      <div className="owner-card owner-calc">
        <p className="owner-wizard-label">Propiedad</p>
        <div className="owner-wizard-chips" role="group" aria-label="Propiedades">
          {propiedades.map((p) => (
            <button key={p.id} type="button" aria-pressed={elegida === p.id} onClick={() => setElegida(p.id)}>
              {formatearDireccion(p)}
            </button>
          ))}
        </div>
      </div>
      {elegida !== null && <RentEstimateCard key={elegida} propertyId={elegida} />}
    </>}

    {modoActual === "rapida" && <>
      <div className="owner-card owner-calc">
        <p className="owner-wizard-label">Dirección</p>
        <AddressField demo={demo} value={carga.direccion}
          onSelect={(direccion) => cambiarCarga({ direccion })} onClear={() => cambiarCarga({ direccion: null })} />
        <div className="owner-calc__counters owner-tool__counters">
          <Counter label="Dormitorios" value={carga.dormitorios} min={0} max={10}
            onChange={(dormitorios) => cambiarCarga({ dormitorios })} />
          <Counter label="Baños" value={carga.banos} min={1} max={10}
            onChange={(banos) => cambiarCarga({ banos })} />
        </div>
        <p className="owner-wizard-label">Metros cubiertos</p>
        <label className="owner-wizard-field">
          <input inputMode="numeric" aria-label="Metros cubiertos" placeholder="0" value={carga.metros}
            onChange={(e) => cambiarCarga({ metros: e.target.value.replace(/\D/g, "").slice(0, 5) })} />
          <span aria-hidden="true">m²</span>
        </label>
      </div>
      {/* Cambiar un dato descarta la estimación anterior: la tarjeta vuelve a empezar. */}
      <RentEstimateCard key={JSON.stringify(carga)} estimar={estimarCarga} faltante={faltante}
        lead="Estime a cuánto se alquila una propiedad así según el mercado de la zona." />
    </>}
  </>;
}
