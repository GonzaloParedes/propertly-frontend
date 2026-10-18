# Design

## Context

- `CreationWizard` runs the contract steps: propiedad, inquilino, alquiler, plazo, actualización, revisión.
- From the property and tenant steps, "nueva"/"nuevo" opens a detour into the property or tenant wizard. `guardarInquilino` and `guardarPropiedad` save immediately (`tenants.create`, `properties.create`), then return to the contract with the new id selected.
- The backend's `POST /contracts/onboarding` takes `property` and `tenant` (`{id}` or `{new: …}`), `contract` (the terms) and `elapsed`. It validates everything first and reports errors with section-prefixed paths. It creates atomically, and answers `409` with `existingTenantId` or `activeContractId` on conflicts.
- UI rules: no native `<select>`, no long forms with every field visible (`docs/design/sistema-ui.md` → Rechazado), and icon plus word for states.

## Decisions

### D-1. Detours become drafts

The property and tenant sub-steps keep their screens. "Siguiente" at their end stores a draft in the wizard state instead of calling the API, and returns to the contract with "Propiedad nueva: <dirección>" selected. A draft can be edited again from the review. Validation in those sub-steps is the same as today; the backend repeats it on save.

### D-2. Step order

Propiedad → Inquilino → Alquiler → Plazo (plus "¿Hasta qué mes le pagaron?" when backdated) → Actualización → Otras condiciones (optional, "Saltear este paso") → Revisión.

"Otras condiciones" groups the optional terms (depósito, comisión, punitorios, garantías), one short group at a time, so the form is never long. Whatever is skipped is not sent.

### D-3. Single save and error routing

"Crear contrato" calls `contracts.onboard` once and disables itself while the request is in flight. A `400` with `errors` is mapped by prefix:

| Prefix | Goes to |
|---|---|
| `property.*` | the property sub-step |
| `tenant.*` | the tenant sub-step |
| `contract.*` | the contract step holding the field |

The flow jumps to the first step with errors, with the messages next to the fields. The review shows a summary of how many need fixing.

### D-4. Conflicts

- **`409` `DUPLICATE_TAX_ID` / `DUPLICATE_PHONE_NUMBER` with `existingTenantId`:** "Ya tiene cargado a <nombre> con ese CUIT/teléfono." It offers "Usar a <nombre>", which replaces the draft with the existing tenant and resends, or "Corregir los datos".
- **`409` `PROPERTY_HAS_ACTIVE_CONTRACT`:** "Esa propiedad ya tiene un contrato vigente", with a link to it.

### D-5. Leaving

With no drafts and nothing entered, closing just closes. Otherwise an in-app dialog says that nothing has been saved and asks for confirmation. Nothing has to be cleaned up on the server.

### D-6. First contract

In Inicio, when the owner has no contracts, the empty state's main action is "Cargar mi primer contrato" and opens this flow. With `contract-pdf-import` present, the PDF-or-manual choice comes first.

## Risks / Trade-offs

- **Drafts live only in memory.** Reloading the page loses them, as today's unsaved wizard steps do. Persisting drafts is a follow-up.
