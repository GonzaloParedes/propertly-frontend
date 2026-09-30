"use client";

import { useState } from "react";
import SectionCard from "@/components/ui/SectionCard";
import Button from "@/components/ui/Button";
import StepIndicator from "@/components/ui/StepIndicator";
import type { Property } from "@/lib/types";
import {
  AddressFields, FormErrorBanner, HomeIcon, OwnersSection, PropertyCreatedScreen,
  PropertyTypeField, TagIcon, nextPropertyId, usePropertyFormFields, validatePropertyForm,
  type PropertyFormErrors,
} from "./property-form-shared";

interface PropertyFormCarouselProps {
  mode?: "page" | "modal";
  onSuccess: (property: Property) => void;
  onCancel?: () => void;
}

const STEP_LABELS = ["Dirección", "Tipo", "Propietario/s"];
const STEP_FIELDS: string[][] = [
  ["address", "city", "province", "postalCode"],
  ["propertyType"],
  ["owners"],
];

function errorsForStep(step: number, allErrors: PropertyFormErrors): PropertyFormErrors {
  const keys = STEP_FIELDS[step];
  return Object.fromEntries(Object.entries(allErrors).filter(([key]) => keys.includes(key)));
}

export default function PropertyFormCarousel({ mode = "page", onSuccess, onCancel }: Readonly<PropertyFormCarouselProps>) {
  const {
    address, setAddress, city, setCity, province, setProvince,
    postalCode, setPostalCode, propertyType, setPropertyType,
    owners, setOwners, errors, setErrors, isPending, setIsPending,
    justCreated, setJustCreated, handleAddressSelect, resetForCreatingAnother: resetFields,
  } = usePropertyFormFields();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const isLastStep = step === STEP_LABELS.length - 1;
  const submitLabel = isPending ? "Guardando…" : "Guardar inmueble";

  function goBack() {
    setErrors({});
    setDirection("back");
    setStep((s) => Math.max(0, s - 1));
  }

  function resetForCreatingAnother() {
    resetFields();
    setStep(0);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Mismo motivo que en PropertyForm: este formulario puede vivir dentro
    // del modal de ContractForm (portado a document.body), y React propaga
    // eventos según el árbol de componentes, no el DOM.
    e.stopPropagation();

    const formErrors = validatePropertyForm({ address, city, province, postalCode, propertyType, owners });

    if (!isLastStep) {
      const stepErrors = errorsForStep(step, formErrors);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
      setDirection("forward");
      setStep((s) => s + 1);
      return;
    }

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
      <StepIndicator steps={STEP_LABELS} currentStep={step} />

      <div key={step} className={direction === "forward" ? "animate-step-in-right" : "animate-step-in-left"}>
        {step === 0 && (
          <SectionCard title="Dirección" description="Busque la dirección para autocompletar ciudad, provincia y código postal." icon={<HomeIcon />}>
            <AddressFields
              address={address} city={city} province={province} postalCode={postalCode}
              errors={errors} isPending={isPending}
              onAddressChange={setAddress} onSelectSuggestion={handleAddressSelect}
              onCityChange={setCity} onProvinceChange={setProvince} onPostalCodeChange={setPostalCode}
            />
          </SectionCard>
        )}

        {step === 1 && (
          <SectionCard title="Tipo de inmueble" description="Seleccione la categoría que mejor describe el inmueble." icon={<TagIcon />}>
            <PropertyTypeField propertyType={propertyType} errors={errors} isPending={isPending} onChange={setPropertyType} />
          </SectionCard>
        )}

        {step === 2 && <OwnersSection owners={owners} errors={errors} onChange={setOwners} />}
      </div>

      <FormErrorBanner errors={errors} />

      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button variant="secondary" type="button" onClick={goBack} disabled={isPending}>
            Anterior
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          {onCancel && (
            <Button variant="secondary" type="button" onClick={onCancel} disabled={isPending}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isLastStep ? submitLabel : "Siguiente"}
          </Button>
        </div>
      </div>
    </form>
  );
}
