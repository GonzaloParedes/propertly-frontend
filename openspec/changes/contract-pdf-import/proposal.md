# Proposal

## Why

An owner arriving with signed leases has to type each one through the six-step wizard with the paper beside them. That is the moment of most friction, and it comes right at the start, before they have seen any value (ALQ-21). The prototype (`prototipo/contrato-desde-pdf`, `docs/design/propuesta-contrato-desde-pdf.md`) validated the flow with simulated reading: upload the signed PDF, let the app read it, and review every value against the document before anything is saved. The backend now specifies the real reading (`propertly-backend` changes `contract-pdf-import` and `ai-usage-limits`). This change turns the prototype into the real flow.

## What Changes

- "Nuevo contrato" first asks how to load it: "Subir el contrato firmado" or "Cargarlo a mano" (unchanged). The upload option shows how many readings the owner has left. When none are left, or reading is unavailable, it explains why and points to manual entry.
- **Upload:** PDF only, one file per lease.
  - The front pre-checks type and size; the backend has the final word.
  - Every backend rejection (not a PDF, too large, too many pages, password-protected, active content, no readings left, reading unavailable) gets a plain message and two ways out: try another file, or load the contract by hand.
- **Reading:** a waiting screen while the backend processes the file.
  - It keeps the prototype's list that ticks off each step, but every tick follows a real stage reported by the backend: opening, reading pages (with a page counter), finding the data, checking.
  - It can be cancelled.
  - It warns when reading takes longer than usual.
  - A failure always offers another file, manual entry, or a retry.
- **Review:** the document on one side and the data on the other, with every value read-only until "Corregir" (prototype decision 2). Each value has a state, always shown as icon plus word:
  - **As written in the contract:** shows the page where it came from.
  - **"Revisar":** the reading had to interpret. It shows what the contract says and what was deduced, resolved with "Está bien así" or a correction.
  - **"Falta completar":** the contract does not say it and the app needs it.
  - **"No se puede cargar así":** clauses the app cannot represent. They are listed with their quote and a way forward.
- "Ver en el contrato" jumps to the cited page and shows the quote. On narrow screens the quote appears under the value. "Crear contrato" is enabled only when nothing is left to resolve, and the footer says how many items remain.
- **Existing property and tenant:** when the backend finds a property (by address) or a tenant (by CUIT) the owner already has, the review offers to use it instead of creating a duplicate.
- **Creating:** the front creates the contract with the reviewed values, then completes the import with the final values and what the owner did to each field (untouched, confirmed, corrected, filled). The PDF stays attached to the contract.
- **Leaving without creating:** discards the reading after confirmation, and tells the owner the file will not be kept.

## Capabilities

### New Capabilities

- `contract-pdf-import`: Choosing PDF or manual entry, uploading, waiting, reviewing values against their source, resolving them, and creating the contract from the review.

### Modified Capabilities

None at the requirement level. The manual wizard keeps its behavior; it gains an entry choice in front of it.

## Impact

- **Front:**
  - `src/components/dashboard/CreationWizard.tsx` and `ContractFromPdf.tsx`, from the prototype branch, rewired to the backend.
  - A new PDF page viewer.
  - `src/lib/backend-client.ts` (`contractImports`), `src/lib/backend-types.ts`, `src/lib/error-codes.ts`.
  - `OwnerWorkspace.css`, and tests under `src/tests/`.
- **New dependency:** `pdfjs-dist`, with a pinned version, to render the cited page (see `design.md` D-3).
- **Backend dependencies:**
  - `contract-pdf-import` and `ai-usage-limits` (routes, result shape, quota).
  - `contract-onboarding-flow`, to create property, tenant and contract in one step.
  - `in-progress-contract-onboarding`, for the decision about installments already elapsed (prototype R4).
  - `late-fee-surcharge` and `contract-guarantor`, for those fields in "También figura en el contrato".

  The flow cannot ship before the first three.
- The simulated prototype (`ContractFromPdfDemo`) is removed once the real flow exists; `/prototipo` no longer offers the PDF choice.
