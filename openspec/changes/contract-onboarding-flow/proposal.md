# Proposal

## Why

Card 1, and the core of ALQ-21: an owner should load property, tenant and contract in one flow, without visiting each section first. The contract wizard already lets them create a tenant or property as a detour. But each detour saves immediately through its own request, so abandoning the contract afterwards leaves an orphan property or tenant, and a new account still faces three separate creations. The backend now offers `POST /contracts/onboarding`, which creates everything at once or nothing (`propertly-backend` change `contract-onboarding-flow`).

## What Changes

- **"Nuevo contrato" becomes the single flow.**
  - Property and tenant steps offer the existing records or "Una propiedad nueva" / "Un inquilino nuevo".
  - The new ones are filled in inside the same flow and kept as drafts, not saved.
  - Then come the contract steps (alquiler, plazo, the elapsed-installments question when applicable, actualización) and an optional, skippable "Otras condiciones" step (depósito, comisión, punitorios, garantías).
- **One save at the end.** The review lists what will be created ("Propiedad nueva: …", "Inquilino nuevo: …") with "Cambiar" links per section. "Crear contrato" sends everything in one request.
- **Errors return to the right step.** Backend errors are mapped by section to the step that holds the field. A tenant that already exists (`409` with `existingTenantId`) offers "Usar a <nombre>" and resends.
- **Leaving keeps nothing.** Nothing was saved, so nothing is left behind. If drafts were entered, an in-app dialog asks for confirmation first.
- **First-contract entry (ALQ-21).** An account with no contracts sees a primary "Cargar mi primer contrato" action in Inicio. It opens this flow, preceded by the PDF-or-manual choice once `contract-pdf-import` exists.
- The standalone property and tenant wizards keep working as today, for loading them on their own.

## Capabilities

### New Capabilities

- `contract-onboarding-flow`: Loading property, tenant and contract in one flow with drafts, a single atomic save, and the first-contract entry.

### Modified Capabilities

None at the requirement level. Inicio's empty state gains the "Cargar mi primer contrato" entry, which is specified in this change's capability; the `inicio` requirements stay as they are.

## Impact

- Front: `src/components/dashboard/CreationWizard.tsx` (drafts instead of detours that save), `OwnerWorkspace.tsx` (Inicio empty state), `src/lib/backend-client.ts` (`contracts.onboard`), `src/lib/backend-types.ts`, `src/lib/error-codes.ts`, tests.
- Backend dependency: `contract-onboarding-flow`. The "Otras condiciones" step uses the fields from `late-fee-surcharge` and `contract-guarantor`, and the plazo step uses `in-progress-contract-onboarding`. The step can ship with the fields that exist at the time.
- Used by: the PDF review (`contract-pdf-import` D-6), which calls the same route.
