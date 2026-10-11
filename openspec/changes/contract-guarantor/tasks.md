# Tasks

- [x] 1.1 Add `guarantees` and remove `depositType` in `src/lib/backend-types.ts`, `src/lib/types.ts` and `src/lib/backend-client.ts`; verify with client tests.
- [x] 1.2 Build the "Garantías" section as a reusable component, `GarantiasSection` (type-first cards, per-type fields, optional fields behind "Agregar más datos", limit, reordering, type change with a warning, CUIT and phone formatting) per D-1 and D-2, with its logic in `src/lib/garantias.ts`; verify with component and unit tests per type.
- [>] 1.2b Moved to `contract-onboarding-flow` task 1.3c: use `GarantiasSection` in the creation flow's "Otras condiciones" step, which does not exist yet (`ContractForm` is a mockup with no endpoint, and there is no contract edit form).
- [x] 1.3 Remove the deposit-type selector and display; add guarantee sentences to `contrato-detalle.ts` (D-3); verify with unit tests.
- [x] 1.4 Run lint and tests, and `openspec validate contract-guarantor --strict`.
