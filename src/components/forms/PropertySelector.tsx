"use client";

import { useState } from "react";
import { Home, Plus } from "lucide-react";
import type { Property } from "@/lib/types";
import { MOCK_PROPERTIES } from "@/lib/mock-data";
import { inputClass, fieldBorderStyle } from "@/components/ui/field-styles";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import PropertyForm from "./PropertyForm";

interface PropertySelectorProps {
  selectedProperty: Property | null;
  onSelect: (property: Property) => void;
  onClear: () => void;
  error?: string;
}

function PlusIcon() {
  return <Plus aria-hidden="true" className="size-[18px]" strokeWidth={2.5} />;
}

function HomeIcon() {
  return <Home aria-hidden="true" className="size-6" />;
}

export default function PropertySelector({ selectedProperty, onSelect, onClear, error }: Readonly<PropertySelectorProps>) {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableProperties, setAvailableProperties] = useState<Property[]>(MOCK_PROPERTIES);

  const results =
    search.trim().length >= 1
      ? availableProperties.filter((p) => p.address.toLowerCase().includes(search.trim().toLowerCase()))
      : availableProperties;

  function handleNewProperty(property: Property) {
    setAvailableProperties((prev) => [property, ...prev]);
    onSelect(property);
    setIsModalOpen(false);
  }

  if (selectedProperty) {
    const ownerNames = selectedProperty.owners.map((po) => po.owner.name).filter(Boolean).join(", ");
    return (
      <div
        className="flex items-start justify-between gap-4 rounded-2xl border-2 p-5"
        style={{ borderColor: "var(--primary)", background: "var(--primary-soft)" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white"
            style={{ color: "var(--primary)" }}
          >
            <HomeIcon />
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-wide uppercase" style={{ color: "var(--primary)" }}>
              Inmueble seleccionado
            </p>
            <p className="font-heading text-[18px] font-bold">{selectedProperty.address}</p>
            <p className="text-[15px]" style={{ color: "var(--text-2)" }}>
              {selectedProperty.propertyType}
              {ownerNames && ` · ${ownerNames}`}
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={onClear} className="shrink-0 bg-white">
          Cambiar inmueble
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Buscar inmueble" htmlFor="property-search" required error={error} hint="Busque entre los inmuebles ya cargados por dirección.">
        <input
          id="property-search"
          type="text"
          placeholder="Ej: Av. Rivadavia 2340"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputClass}
          style={fieldBorderStyle(!!error)}
        />
      </Field>

      {results.length > 0 ? (
        <ul className="flex flex-col gap-2" role="listbox" aria-label="Inmuebles disponibles">
          {results.map((property) => {
            const ownerNames = property.owners.map((po) => po.owner.name).filter(Boolean).join(", ");
            return (
              <li key={property.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => onSelect(property)}
                  className="flex w-full cursor-pointer flex-col items-start rounded-[10px] border px-4 py-3 text-left transition-colors hover:bg-[var(--bg)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="font-bold">{property.address}</span>
                  <span className="text-[14px]" style={{ color: "var(--text-2)" }}>
                    {property.propertyType} · {property.city}
                    {ownerNames && ` · ${ownerNames}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[15px]" style={{ color: "var(--text-2)" }}>
          No se encontraron inmuebles con esa dirección.
        </p>
      )}

      <Button variant="secondary" onClick={() => setIsModalOpen(true)} className="self-start">
        <PlusIcon />
        Crear inmueble nuevo
      </Button>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear inmueble nuevo"
        description="Complete el alta del inmueble. Al guardar, quedará seleccionado en este contrato."
      >
        <PropertyForm mode="modal" onSuccess={handleNewProperty} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}
