# Tasks

- [ ] 1.1 Add `contracts.onboard` and its types, plus the conflict extensions in `src/lib/error-codes.ts`; verify with client tests.
- [ ] 1.2 Turn the property and tenant detours in `CreationWizard` into drafts (D-1); verify that no create request is sent before "Crear contrato".
- [ ] 1.3 Add the "Otras condiciones" optional step with the fields available at the time (D-2); verify skip and partial entry.
- [ ] 1.3b The late-fee group of "Otras condiciones" uses the method options of `late-fee-surcharge` D-1 (`lateFeeMethod`, unit-aware value, grace-days help), sent only when filled; moved from `late-fee-surcharge` 2.1 because `ContractForm` is a mockup with no endpoint and `CreationWizard` is the real form. Verify with form tests for each method and the empty case.
- [ ] 1.3c The guarantees group of "Otras condiciones" uses `GarantiasSection` from `contract-guarantor`, sends `armarGarantias(...)` as `guarantees` only when at least one is entered, and places backend errors with `erroresDelBackend`; moved from `contract-guarantor` 1.2b. Verify that an empty section sends no `guarantees` and that a backend error lands next to its field.
- [ ] 1.4 Review with sections and "Cambiar", the single save and in-flight disabling, and error routing by prefix (D-3); verify with component tests.
- [ ] 1.4b The review shows `PagosTranscurridos` from `in-progress-contract-onboarding` with the draft's dates, rent and update frequency, blocks "Crear contrato" until it is answered, sends `elapsed` in `POST /contracts/onboarding`, and re-asks on `ELAPSED_INVOICES_DECISION_REQUIRED` with the backend's periods; moved from `in-progress-contract-onboarding` 1.3b. Verify with component tests.
- [ ] 1.5 Duplicate-tenant and active-contract conflicts (D-4), and the leave confirmation (D-5); verify with component tests.
- [ ] 1.6 "Cargar mi primer contrato" in Inicio's empty state (D-6); verify with a component test.
- [ ] 1.7 Update `docs/design/sistema-ui.md` (drafts in the wizard), run lint and tests, and `openspec validate contract-onboarding-flow --strict`.
