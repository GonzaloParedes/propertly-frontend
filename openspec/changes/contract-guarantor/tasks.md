# Tasks

- [ ] 1.1 Add `guarantees` and remove `depositType` in `src/lib/backend-types.ts`, `src/lib/types.ts` and `src/lib/backend-client.ts`; verify with client tests.
- [ ] 1.2 Build the "Garantías" section (type-first cards, per-type fields, optional fields behind "Agregar más datos", limit, type change, CUIT and phone formatting) per D-1 and D-2; use it in `ContractForm` and in the creation flow's "Otras condiciones" step; verify with component tests per type.
- [ ] 1.3 Remove the deposit-type selector and display; add guarantee sentences to `contrato-detalle.ts` (D-3); verify with unit tests.
- [ ] 1.4 Run lint and tests, and `openspec validate contract-guarantor --strict`.
