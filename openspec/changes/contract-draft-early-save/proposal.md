# Proposal

## Why

Today the "Nuevo contrato" draft is born only when the owner leaves the first step. Work started inside that step, such as a new property half loaded, is lost if the owner leaves before moving on, and leaving then asks "¿Salir sin crear el contrato?", a dialog that only exists because that work was never saved.

## What Changes

- **The draft is born with the owner's first own input**, instead of when leaving the first step. "Own input" is any of:
  - completing the location of a new property: street, number, city and province;
  - filling any field of a new tenant;
  - moving past the first step with "Seguir".

  Opening "Nuevo contrato", picking one of the owner's existing properties, typing in the address search without choosing a result, or a new property's location left incomplete does not create a draft. This replaces the requirement "The contract flow becomes a draft after its first step" of `contract-drafts`.
- **The draft keeps the half-loaded detour.** Besides what it keeps today, it holds the fields of a new property or tenant being loaded, even if unconfirmed, and where the owner was: which detour and which step of it.
- **Resuming reopens the detour.** "Continuar" returns to the exact place, including the step of a new property being loaded, with what was typed.
- **Detour step changes save immediately,** like contract step changes. Completing the location of a new property also saves immediately.
- **Leaving:**
  - a draft leaves without asking and says it was kept, as today;
  - with nothing of the owner's own loaded, it just closes;
  - **REMOVED:** the "¿Salir sin crear el contrato? No se guardó nada" dialog;
  - when own work exists but could not be kept (the owner has the maximum of drafts, or the draft could not be created), leaving still asks for confirmation, with a text that says why it was not kept.
- **«Completar después» is removed.** It sat next to «Seguir» and moved on without the required data, while «Seguir» only worked with it. With the draft saved from the first own input, an owner who lacks a datum can leave the step and resume it later, so the button is no longer needed. A step now cannot be skipped. The review keeps listing incomplete steps with a link, because a resumed draft can still hold one (a tenant or property that is no longer available), and "Crear contrato" stays unavailable until none remains.
- **Creating the draft is safe to retry.** The first save carries a key the backend uses to avoid creating the same draft twice, so a retried or final (page-close) creation does not take a second slot.

Unchanged: the 3-draft limit and its indicator, the 90-day expiry, no browser prompt when closing the tab, and saving a draft never creates a property, tenant or contract.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `contract-drafts`:
  - "The contract flow becomes a draft after its first step" is removed and replaced by "The contract flow becomes a draft with the owner's first own input".
  - "A draft saves itself" also keeps the half-loaded detour and its position.
  - "The flow shows whether the draft is saved" covers a draft that could not be created.
  - "Leaving keeps the draft" drops the "nothing was saved" dialog.
  - "Drafts can be resumed from Inicio, Contratos and \"Nuevo contrato\"" reopens the detour.
  - "Steps can be completed later" is removed and replaced by "Incomplete steps are listed in the review".

  `contract-drafts` is not archived yet; it must be archived before this change (see `design.md`, Migration Plan).

## Impact

- **Front:**
  - `src/components/dashboard/CreationWizard.tsx`: when the draft is born, the detour in the payload and on resume, and leaving.
  - `src/hooks/useAutoguardado.ts`: birth on own input, immediate saves on position changes, the idempotency key, and a `keepalive` creation on page close.
  - `src/lib/borradores.ts`: payload `schemaVersion` 2 with the detour and its forms, plus reading version 1.
  - `src/lib/api.ts` and `src/lib/backend-client.ts`: `apiPost` with `keepalive` and extra headers, and `contractDrafts.create` with the key.
  - `docs/design/sistema-ui.md`, and tests.
- **Backend dependency:** the same-named change `contract-draft-early-save` in `propertly-backend` (idempotent `POST /contract-drafts` through `Idempotency-Key`).
- **Non-goals:**
  - The browser's "leave page?" prompt.
  - Saving text typed in the address search without choosing a result.
  - Changing the 3-draft maximum or the 90-day expiry.
