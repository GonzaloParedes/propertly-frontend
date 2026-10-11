# Tasks

- [ ] 1.1 Add `contracts.onboard` and its types, plus the conflict extensions in `src/lib/error-codes.ts`; verify with client tests.
- [ ] 1.2 Turn the property and tenant detours in `CreationWizard` into drafts (D-1); verify that no create request is sent before "Crear contrato".
- [ ] 1.3 Add the "Otras condiciones" optional step with the fields available at the time (D-2); verify skip and partial entry.
- [ ] 1.3b The late-fee group of "Otras condiciones" uses the method options of `late-fee-surcharge` D-1 (`lateFeeMethod`, unit-aware value, grace-days help), sent only when filled; moved from `late-fee-surcharge` 2.1 because `ContractForm` is a mockup with no endpoint and `CreationWizard` is the real form. Verify with form tests for each method and the empty case.
- [ ] 1.4 Review with sections and "Cambiar", the single save and in-flight disabling, and error routing by prefix (D-3); verify with component tests.
- [ ] 1.5 Duplicate-tenant and active-contract conflicts (D-4), and the leave confirmation (D-5); verify with component tests.
- [ ] 1.6 "Cargar mi primer contrato" in Inicio's empty state (D-6); verify with a component test.
- [ ] 1.7 Update `docs/design/sistema-ui.md` (drafts in the wizard), run lint and tests, and `openspec validate contract-onboarding-flow --strict`.
