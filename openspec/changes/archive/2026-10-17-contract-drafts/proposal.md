# Proposal

## Why

Owners load existing leases from printed copies or emails, and they often lack some terms when they sit down to do it: the adjustment method, the late-fee clause, the tenant's phone. Today "Nuevo contrato" keeps everything in memory until "Crear contrato" (`contract-onboarding-flow` D-5: "Persisting drafts is a follow-up"). An owner who cannot finish loses what they entered. They also often come back on another device, so a browser-only draft would not help.

## What Changes

- **"Nuevo contrato" saves itself.** Once the owner moves past the first step (the property), the flow becomes a draft. From then on, everything is saved automatically, with no button to press:
  - on every step change;
  - a couple of seconds after typing stops;
  - one last time when the page is closed.

  Drafts are stored by the backend, so they can be resumed from any device. A discreet indicator in the flow's header says whether the draft is saved, saving, or failing to save.
- **Steps can be left for later.** A step with missing required data offers "Completar después", which moves on and marks the step as pending. The review lists the pending steps, each with a link, and "Crear contrato" stays unavailable until none remain.
- **Leaving the flow:**
  - Once it is a draft, leaving needs no question: a toast says it was kept as a draft and where to find it.
  - Before it is a draft, leaving with something entered still asks for confirmation, as today.
  - "Descartar borrador" in the flow's header deletes the draft, after confirmation.
- **Optional signed PDF.** The review offers attaching the contract's PDF. It is kept with the draft and becomes the contract's document when the contract is created. It is not read with AI and does not use reading quota.
- **Drafts in Inicio.** Each draft appears in "Lo que requiere acción del propietario", with when it was last edited, "Continuar" and "Descartar". Discarding asks for confirmation.
- **Drafts in Contratos.** A "Borradores" group appears above the contract list, with the same actions.
- **"Nuevo contrato" offers to resume.** With drafts present, it first offers to continue one or start a new contract. With 3 drafts, the maximum, a new contract requires finishing or discarding one.
- **Expiry.** Drafts are deleted 90 days after their last edit. From 15 days before, their notice says when it will happen. Editing a draft restarts the period.

## Capabilities

### New Capabilities

- `contract-drafts`: Automatically keeping an unfinished contract, with pending steps and an optional PDF, as a draft; resuming it from Inicio, Contratos or "Nuevo contrato"; discarding it; and its limit and expiry.

### Modified Capabilities

- `inicio`: "Lo que requiere acción del propietario" also lists contract drafts. A draft counts as pending, so the section no longer says that nothing is pending while drafts exist.

The in-flight `contract-onboarding-flow` change has a requirement "Leaving keeps nothing". This change refines it: once the flow is a draft, leaving keeps the draft. Since that capability is not archived yet, the refined behavior is specified here as a `contract-drafts` requirement, and `contract-onboarding-flow` must be archived first so its main spec can be updated in the same pass (see `design.md`, Migration Plan).

## Impact

- **Front:**
  - `src/components/dashboard/CreationWizard.tsx`: autosave and its indicator, resume, pending steps, leaving and discarding, and the PDF in the review.
  - `src/components/dashboard/OwnerWorkspace.tsx`: notices in Inicio, the "Borradores" group in Contratos, the resume offer.
  - `src/lib/backend-client.ts` (`contractDrafts`), `src/lib/backend-types.ts`, `src/lib/error-codes.ts`.
  - A new `src/lib/borradores.ts` for payload serialization and versioning.
  - A new autosave hook.
  - Tests.
- **Backend dependency:** the same-named change `contract-drafts` in `propertly-backend` (`/contract-drafts` routes, the 3-draft limit, 90-day expiry, the draft PDF, and `draftId` in `POST /contracts/onboarding`).
- **Non-goals:**
  - Saving a draft from the PDF import review (v2, which needs the backend to keep the import alive for the draft).
  - Email reminders before expiry.
  - Hiding a draft's notice without discarding it.
