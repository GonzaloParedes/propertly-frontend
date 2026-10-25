# Proposal

## Why

Card 8: owners need to record who guarantees each lease, as competitors allow. The backend (`propertly-backend` change `contract-guarantor`) now stores up to three typed guarantees per contract, and removes the misnamed deposit type, whose non-cash values were really guarantee forms.

## What Changes

- **A "Garantías" section** in the contract form (edit) and in the optional "Otras condiciones" step of the creation flow.
  - Up to three guarantees, each chosen in plain words: "Un garante con recibo de sueldo", "Un garante con propiedad (garantía propietaria)", "Un seguro de caución".
  - Each shows only the fields its type uses.
  - Guarantees can be added, removed and reordered.
- **Contract detail** lists the guarantees as sentences, for example "Garantía propietaria de Ana Gómez: Av. Rivadavia 1234, matrícula 15-1234".
- **BREAKING (with the backend):** the deposit-type selector disappears. The deposit is its amount only.
- **Tenant portal:** unchanged. Guarantees are owner-only.

## Capabilities

### New Capabilities

- `contract-guarantor`: Entering, validating and showing a contract's guarantees.

### Modified Capabilities

- `detalle-contrato`: shows guarantees and stops showing the deposit type. The behavior is specified in this change's capability; the existing requirements stay as they are.

## Impact

- Front: `src/components/forms/ContractForm.tsx`, the "Otras condiciones" step of `CreationWizard` (`contract-onboarding-flow`), `src/lib/contrato-detalle.ts`, `src/lib/backend-types.ts`, `src/lib/types.ts`, `src/lib/backend-client.ts`, tests.
- Backend dependency: `contract-guarantor`, shipped together because of the `depositType` removal.
- PDF import: guarantees read from the lease are reviewed in "También figura en el contrato" (`contract-pdf-import`).
