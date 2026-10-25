"use client";

import { useState } from "react";
import { Check, Home, Tag, Users } from "lucide-react";
import Field from "@/components/ui/Field";
import SectionCard from "@/components/ui/SectionCard";
import Button from "@/components/ui/Button";
import { inputClass, selectClass, fieldBorderStyle } from "@/components/ui/field-styles";
import AddressAutocomplete from "./AddressAutocomplete";
import OwnersField from "./OwnersField";
import { PROPERTY_TYPES, PROVINCES, type AddressSuggestion } from "@/lib/mock-data";
import type { Property, PropertyOwner } from "@/lib/types";

export type PropertyFormErrors = Record<string, string>;

export interface PropertyFormValues {
  address: string;
  city: string;
  province: string;
  postalCode: string;
  propertyType: string;
  owners: PropertyOwner[];
}

export function HomeIcon() {
  return <Home aria-hidden="true" className="size-5" />;
}

export function TagIcon() {
  return <Tag aria-hidden="true" className="size-5" />;
}

export function UsersIcon() {
  return <Users aria-hidden="true" className="size-5" />;
}

let idCounter = 0;
export function nextPropertyId(): string {
  idCounter += 1;
  return `prop-${Date.now()}-${idCounter}`;
}

export function validatePropertyForm(form: PropertyFormValues): PropertyFormErrors {
  const errors: PropertyFormErrors = {};
  if (!form.address.trim()) errors.address = "Ingrese la dirección del inmueble.";
  if (!form.city.trim()) errors.city = "Ingrese la ciudad.";
  if (!form.province.trim()) errors.province = "Seleccione la provincia.";
  if (!form.postalCode.trim()) errors.postalCode = "Ingrese el código postal.";
  if (!form.propertyType.trim()) errors.propertyType = "Seleccione el tipo de inmueble.";
  if (form.owners.length === 0) errors.owners = "Agregue al menos un propietario.";

  return errors;
}

/** El estado de campos que PropertyForm y PropertyFormCarousel comparten sin cambios. */
export function usePropertyFormFields() {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [owners, setOwners] = useState<PropertyOwner[]>([]);
  const [errors, setErrors] = useState<PropertyFormErrors>({});
  const [isPending, setIsPending] = useState(false);
  const [justCreated, setJustCreated] = useState<Property | null>(null);

  function handleAddressSelect(suggestion: AddressSuggestion) {
    setAddress(suggestion.label);
    setCity(suggestion.city);
    setProvince(suggestion.province);
    setPostalCode(suggestion.postalCode);
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

  return {
    address, setAddress, city, setCity, province, setProvince,
    postalCode, setPostalCode, propertyType, setPropertyType,
    owners, setOwners, errors, setErrors, isPending, setIsPending,
    justCreated, setJustCreated, handleAddressSelect, resetForCreatingAnother,
  };
}

export function PropertyCreatedScreen({ property, onCreateAnother }: Readonly<{
  property: Property;
  onCreateAnother: () => void;
}>) {
  return (
    <div
      className="flex flex-col items-center rounded-2xl border bg-white p-8 text-center"
      style={{ borderColor: "var(--border)", boxShadow: "var(--shadow)" }}
    >
      <div
        className="mb-4 flex size-16 items-center justify-center rounded-full"
        style={{ background: "var(--success-bg)", color: "var(--success)" }}
      >
        <Check aria-hidden="true" className="size-8" strokeWidth={2.5} />
      </div>
      <h2 className="font-heading mb-2 text-[22px] font-bold">Inmueble creado</h2>
      <p className="mb-6" style={{ color: "var(--text-2)" }}>
        {property.address} quedó guardado y listo para usarse en un contrato.
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCreateAnother}>
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

export function AddressFields({ address, city, province, postalCode, errors, isPending, onAddressChange, onSelectSuggestion, onCityChange, onProvinceChange, onPostalCodeChange }: Readonly<{
  address: string;
  city: string;
  province: string;
  postalCode: string;
  errors: PropertyFormErrors;
  isPending: boolean;
  onAddressChange: (value: string) => void;
  onSelectSuggestion: (suggestion: AddressSuggestion) => void;
  onCityChange: (value: string) => void;
  onProvinceChange: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
}>) {
  return (
    <>
      <Field label="Dirección" htmlFor="prop-address" required error={errors.address}>
        <AddressAutocomplete
          id="prop-address"
          value={address}
          onChange={onAddressChange}
          onSelectSuggestion={onSelectSuggestion}
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
            onChange={(e) => onCityChange(e.target.value)}
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
            onChange={(e) => onProvinceChange(e.target.value)}
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
            onChange={(e) => onPostalCodeChange(e.target.value)}
            className={inputClass}
            style={fieldBorderStyle(!!errors.postalCode)}
          />
        </Field>
      </div>
    </>
  );
}

export function PropertyTypeField({ propertyType, errors, isPending, onChange }: Readonly<{
  propertyType: string;
  errors: PropertyFormErrors;
  isPending: boolean;
  onChange: (value: string) => void;
}>) {
  return (
    <Field label="Tipo de inmueble" htmlFor="prop-type" required error={errors.propertyType}>
      <select
        id="prop-type"
        required
        disabled={isPending}
        value={propertyType}
        onChange={(e) => onChange(e.target.value)}
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
  );
}

export function OwnersSection({ owners, errors, onChange }: Readonly<{
  owners: PropertyOwner[];
  errors: PropertyFormErrors;
  onChange: (owners: PropertyOwner[]) => void;
}>) {
  return (
    <SectionCard title="Propietario/s" description="Puede agregar más de un propietario si el inmueble es condominio." icon={<UsersIcon />}>
      <OwnersField owners={owners} onChange={onChange} error={errors.owners} />
    </SectionCard>
  );
}

export function FormErrorBanner({ errors }: Readonly<{ errors: PropertyFormErrors }>) {
  if (Object.keys(errors).length === 0) return null;
  return (
    <p role="alert" className="rounded-[8px] px-3 py-2 text-[15px] font-semibold" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
      Revise los campos marcados antes de continuar.
    </p>
  );
}
