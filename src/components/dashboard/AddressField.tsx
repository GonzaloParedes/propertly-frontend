"use client";

import { useEffect, useState } from "react";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { AddressSuggestionResponse } from "@/lib/backend-types";
import type { Direccion } from "@/lib/borradores";
import { Icon as AppIcon, type IconName } from "@/components/ui/Icon";
import MapPickerField from "@/components/dashboard/MapPickerField";

/**
 * El buscador de direcciones del alta de propiedad: sugiere con `/address-lookup/autocomplete`
 * y resuelve la elegida con `/address-lookup/resolve`. Vive aparte para que lo usen el asistente
 * y la carga rápida del predictor en Herramientas.
 */

/** Como en el asistente, los íconos van un pelín más grandes (22) que el resto de la app (21). */
function Icon({ name, size = 22 }: Readonly<{ name: IconName; size?: number }>) {
  return <AppIcon name={name} size={size} />;
}

/** `Direccion` (en `borradores.ts`) tiene los mismos campos que `PropertyRequest`. */
export const etiquetaDireccion = (d: Direccion) => `${d.street} ${d.number}`;

/** Sólo para /prototipo: sin sesión `/address-lookup` daría 401. */
const DIRECCIONES_DEMO: (Direccion & AddressSuggestionResponse)[] = [
  { reference: "demo-1", label: "Lavalle 950", street: "Lavalle", number: "950", city: "CABA", province: "Ciudad Autónoma de Buenos Aires", postalCode: "", latitude: null, longitude: null },
  { reference: "demo-2", label: "Av. Rivadavia 2340", street: "Av. Rivadavia", number: "2340", city: "CABA", province: "Ciudad Autónoma de Buenos Aires", postalCode: "", latitude: null, longitude: null },
  { reference: "demo-3", label: "Mitre 78", street: "Mitre", number: "78", city: "San Isidro", province: "Buenos Aires", postalCode: "", latitude: null, longitude: null },
];

/** El backend no busca por debajo de 3 caracteres (app.address-lookup.min-query-length). */
const MIN_BUSQUEDA = 3;

/** Sugerencias de `/address-lookup/autocomplete`, con espera al tipeo y descarte de respuestas viejas. */
function useSugerencias(query: string, demo: boolean) {
  const q = query.trim();
  const [resultado, setResultado] = useState<{ q: string; lista: AddressSuggestionResponse[] }>({ q: "", lista: [] });

  useEffect(() => {
    if (demo || q.length < MIN_BUSQUEDA) return;
    let vigente = true;
    const t = setTimeout(() => {
      AlquiaBackendClient.addressLookup.autocomplete(q)
        .then((lista) => vigente && setResultado({ q, lista }))
        .catch(() => vigente && setResultado({ q, lista: [] }));
    }, 250);
    return () => { vigente = false; clearTimeout(t); };
  }, [q, demo]);

  if (demo) {
    const n = q.toLowerCase();
    return { sugerencias: q.length < MIN_BUSQUEDA ? [] : DIRECCIONES_DEMO.filter((d) => d.label.toLowerCase().includes(n)), buscando: false };
  }
  return { sugerencias: q.length < MIN_BUSQUEDA ? [] : resultado.lista, buscando: q.length >= MIN_BUSQUEDA && resultado.q !== q };
}

/** Combobox accesible: flechas para moverse, Enter para elegir, Escape para cerrar. */
export default function AddressField({ value, demo, onSelect, onClear }: Readonly<{
  demo: boolean;
  value: Direccion | null;
  onSelect: (d: Direccion) => void;
  onClear: () => void;
}>) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [falloResolver, setFalloResolver] = useState(false);
  const [mapa, setMapa] = useState(false);

  const q = query.trim();
  const { sugerencias, buscando } = useSugerencias(query, demo);

  if (value) {
    return (
      <div className="owner-ac-chosen">
        <span className="owner-ac-chosen__body">
          <b>{etiquetaDireccion(value)}</b>
          <small>{[value.city, value.province].filter(Boolean).join(" · ") || "Falta la ciudad"}</small>
        </span>
        <button type="button" className="owner-ac-chosen__change" onClick={() => { onClear(); setQuery(""); }}>
          Cambiar
        </button>
      </div>
    );
  }

  const elegir = (d: Direccion) => { onSelect(d); setAbierto(false); setQuery(""); setMapa(false); };
  const elegirSugerencia = async (sugerencia: AddressSuggestionResponse) => {
    setFalloResolver(false);
    try {
      const r = demo
        ? DIRECCIONES_DEMO.find((d) => d.reference === sugerencia.reference)!
        : await AlquiaBackendClient.addressLookup.resolve(sugerencia.reference);
      const conCoordenadas = r.latitude != null && r.longitude != null;
      elegir({
        street: r.street ?? "", number: r.number ?? "", city: r.city ?? "", province: r.province ?? "",
        postalCode: r.postalCode ?? "",
        latitude: conCoordenadas ? r.latitude : null, longitude: conCoordenadas ? r.longitude : null,
      });
    } catch (e) {
      console.error("Failed to resolve address suggestion", e);
      setFalloResolver(true);
    }
  };

  if (mapa) {
    return (
      <MapPickerField
        initialStreet={query.trim()}
        onConfirm={elegir}
        onCancel={() => setMapa(false)}
      />
    );
  }

  return (
    <div className="owner-ac">
      <div className="owner-ac__box">
        <Icon name="search" />
        <input
          role="combobox"
          aria-expanded={abierto && sugerencias.length > 0}
          aria-controls="ac-lista"
          aria-autocomplete="list"
          aria-activedescendant={abierto && sugerencias.length ? `ac-opt-${activo}` : undefined}
          aria-label="Buscar la dirección"
          placeholder="Empezá a escribir la calle…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setAbierto(true); setActivo(0); }}
          onKeyDown={(e) => {
            if (!sugerencias.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setAbierto(true); setActivo((i) => (i + 1) % sugerencias.length); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((i) => (i - 1 + sugerencias.length) % sugerencias.length); }
            else if (e.key === "Enter") { e.preventDefault(); void elegirSugerencia(sugerencias[activo]); }
            else if (e.key === "Escape") { setAbierto(false); }
          }}
        />
      </div>
      {abierto && sugerencias.length > 0 && (
        <ul className="owner-ac__list" id="ac-lista" role="listbox" aria-label="Direcciones sugeridas">
          {sugerencias.map((d, i) => (
            <li key={d.reference} id={`ac-opt-${i}`} role="option" aria-selected={i === activo}>
              <button type="button" className={i === activo ? "is-active" : ""}
                onMouseEnter={() => setActivo(i)} onClick={() => void elegirSugerencia(d)}>
                <b>{d.label}</b>
              </button>
            </li>
          ))}
        </ul>
      )}
      {falloResolver && <p className="owner-ac__empty" role="alert">No pudimos obtener esa dirección. Elija otra o inténtelo de nuevo.</p>}
      {q.length >= MIN_BUSQUEDA && !buscando && sugerencias.length === 0 && (
        <p className="owner-ac__empty">
          No encontramos esa dirección.{" "}
          <button type="button" onClick={() => setMapa(true)}>Marcar en el mapa</button>
          {" · "}
          <button type="button" onClick={() => elegir({ street: query.trim(), number: "", city: "", province: "", postalCode: "", latitude: null, longitude: null })}>
            Usarla igual
          </button>
        </p>
      )}
    </div>
  );
}
