"use client";

import SectionCard from "@/components/ui/SectionCard";
import Button from "@/components/ui/Button";
import type { Property } from "@/lib/types";
import {
  AddressFields, FormErrorBanner, HomeIcon, OwnersSection, PropertyCreatedScreen,
  PropertyTypeField, nextPropertyId, usePropertyFormFields, validatePropertyForm,
} from "./property-form-shared";

interface PropertyFormProps {
  mode?: "page" | "modal";
  onSuccess: (property: Property) => void;
  onCancel?: () => void;
}

export default function PropertyForm({ mode = "page", onSuccess, onCancel }: Readonly<PropertyFormProps>) {
  const {
    address, setAddress, city, setCity, province, setProvince,
    postalCode, setPostalCode, propertyType, setPropertyType,
    owners, setOwners, errors, setErrors, isPending, setIsPending,
    justCreated, setJustCreated, handleAddressSelect, resetForCreatingAnother,
  } = usePropertyFormFields();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Cuando este formulario se usa dentro del modal de ContractForm, React
    // propaga eventos según el árbol de componentes, no el DOM (el modal está
    // portado a document.body). Sin stopPropagation, este submit también
    // dispararía el onSubmit del <form> exterior del contrato.
    e.stopPropagation();
    const formErrors = validatePropertyForm({ address, city, province, postalCode, propertyType, owners });
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    setErrors({});
    setIsPending(true);

    // Maqueta: no hay endpoint /properties todavía — simula la latencia de guardado.
    await new Promise((resolve) => setTimeout(resolve, 500));

    const property: Property = {
      id: nextPropertyId(),
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

  if (justCreated) {
    return <PropertyCreatedScreen property={justCreated} onCreateAnother={resetForCreatingAnother} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <SectionCard title="Ubicación" description="Busque la dirección para autocompletar ciudad, provincia y código postal." icon={<HomeIcon />}>
        <AddressFields
          address={address} city={city} province={province} postalCode={postalCode}
          errors={errors} isPending={isPending}
          onAddressChange={setAddress} onSelectSuggestion={handleAddressSelect}
          onCityChange={setCity} onProvinceChange={setProvince} onPostalCodeChange={setPostalCode}
        />
        <PropertyTypeField propertyType={propertyType} errors={errors} isPending={isPending} onChange={setPropertyType} />
      </SectionCard>

      <OwnersSection owners={owners} errors={errors} onChange={setOwners} />

      <FormErrorBanner errors={errors} />

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
