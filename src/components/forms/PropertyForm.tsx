"use client";

import { useState } from "react";
import Field from "@/components/ui/Field";
import SectionCard from "@/components/ui/SectionCard";
import Button from "@/components/ui/Button";
import { inputClass, selectClass, fieldBorderStyle } from "@/components/ui/field-styles";
import AddressAutocomplete from "./AddressAutocomplete";
import OwnersField from "./OwnersField";
import { PROPERTY_TYPES, PROVINCES, type AddressSuggestion } from "@/lib/mock-data";
import type { Property, PropertyOwner } from "@/lib/types";

interface PropertyFormProps {
  mode?: "page" | "modal";
  onSuccess: (property: Property) => void;
  onCancel?: () => void;
}

type Errors = Record<string, string>;

function HomeIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      <circle cx="17" cy="9" r="2.8" />
      <path d="M21.5 20c0-2.9-1.9-5.3-4.5-6.1" />
    </svg>
  );
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function validate(form: {
  address: string;
  city: string;
  province: string;
  postalCode: string;
  propertyType: string;
  owners: PropertyOwner[];
}): Errors {
  const errors: Errors = {};
  if (!form.address.trim()) errors.address = "Ingrese la dirección del inmueble.";
  if (!form.city.trim()) errors.city = "Ingrese la ciudad.";
  if (!form.province.trim()) errors.province = "Seleccione la provincia.";
  if (!form.postalCode.trim()) errors.postalCode = "Ingrese el código postal.";
  if (!form.propertyType.trim()) errors.propertyType = "Seleccione el tipo de inmueble.";
  if (form.owners.length === 0) errors.owners = "Agregue al menos un propietario.";

  return errors;
}

export default function PropertyForm({ mode = "page", onSuccess, onCancel }: PropertyFormProps) {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [owners, setOwners] = useState<PropertyOwner[]>([]);

  const [errors, setErrors] = useState<Errors>({});
  const [isPending, setIsPending] = useState(false);
  const [justCreated, setJustCreated] = useState<Property | null>(null);

  function handleAddressSelect(suggestion: AddressSuggestion) {
    setAddress(suggestion.label);
    setCity(suggestion.city);
    setProvince(suggestion.province);
    setPostalCode(suggestion.postalCode);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Cuando este formulario se usa dentro del modal de ContractForm, React
    // propaga eventos según el árbol de componentes, no el DOM (el modal está
    // portado a document.body). Sin stopPropagation, este submit también
    // dispararía el onSubmit del <form> exterior del contrato.
    e.stopPropagation();
    const formErrors = validate({ address, city, province, postalCode, propertyType, owners });
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    setErrors({});
    setIsPending(true);

    // Maqueta: no hay endpoint /properties todavía — simula la latencia de guardado.
    await new Promise((resolve) => setTimeout(resolve, 500));

    const property: Property = {
      id: nextId("prop"),
      address: address.trim(),
      city: city.trim(),
      province,
      postalCode: postalCode.trim(),
      propertyType,
      owners,
    };

    setIsPending(false);
    if (mode === "page") {
      setJustCreated(property);
    }
    onSuccess(property);
  }

  function resetForCreatingAnother() {
    setAddress("");
    setCity("");
    setProvince("");
    setPostalCode("");
    setPropertyType("");
    setOwners([]);
    setJustCreated(null);
  }

  if (justCreated) {
    return (
      <div
        className="flex flex-col items-center rounded-2xl border bg-white p-8 text-center"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow)" }}
      >
        <div
          className="mb-4 flex size-16 items-center justify-center rounded-full"
          style={{ background: "var(--success-bg)", color: "var(--success)" }}
        >
          <svg aria-hidden="true" className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="font-heading mb-2 text-[22px] font-bold">Inmueble creado</h2>
        <p className="mb-6" style={{ color: "var(--text-2)" }}>
          {justCreated.address} quedó guardado y listo para usarse en un contrato.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={resetForCreatingAnother}>
            Cargar otro inmueble
          </Button>
          <Button
            onClick={() => {
              window.location.href = "/dashboard/contratos/nuevo";
            }}
          >
            Crear contrato
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <SectionCard title="Ubicación" description="Busque la dirección para autocompletar ciudad, provincia y código postal." icon={<HomeIcon />}>
        <Field label="Dirección" htmlFor="prop-address" required error={errors.address}>
          <AddressAutocomplete
            id="prop-address"
            value={address}
            onChange={setAddress}
            onSelectSuggestion={handleAddressSelect}
            error={errors.address}
            disabled={isPending}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Ciudad" htmlFor="prop-city" required error={errors.city}>
            <input
              id="prop-city"
              type="text"
              required
              disabled={isPending}
              placeholder="Ej: CABA"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClass}
              style={fieldBorderStyle(!!errors.city)}
            />
          </Field>

          <Field label="Provincia" htmlFor="prop-province" required error={errors.province}>
            <select
              id="prop-province"
              required
              disabled={isPending}
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className={selectClass}
              style={fieldBorderStyle(!!errors.province)}
            >
              <option value="">Seleccionar…</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Código postal" htmlFor="prop-postal" required error={errors.postalCode}>
            <input
              id="prop-postal"
              type="text"
              required
              disabled={isPending}
              placeholder="Ej: C1033"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className={inputClass}
              style={fieldBorderStyle(!!errors.postalCode)}
            />
          </Field>
        </div>

        <Field label="Tipo de inmueble" htmlFor="prop-type" required error={errors.propertyType}>
          <select
            id="prop-type"
            required
            disabled={isPending}
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className={selectClass}
            style={fieldBorderStyle(!!errors.propertyType)}
          >
            <option value="">Seleccionar…</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </SectionCard>

      <SectionCard title="Propietario/s" description="Puede agregar más de un propietario si el inmueble es condominio." icon={<UsersIcon />}>
        <OwnersField owners={owners} onChange={setOwners} error={errors.owners} />
      </SectionCard>

      {Object.keys(errors).length > 0 && (
        <p role="alert" className="rounded-[8px] px-3 py-2 text-[15px] font-semibold" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
          Revise los campos marcados antes de continuar.
        </p>
      )}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar inmueble"}
        </Button>
      </div>
    </form>
  );
}
