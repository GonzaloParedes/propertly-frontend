# Tasks

- [ ] 1.1 Add `elapsed` to the contract-creation types, payment `origin`/`hasReceipt`, and the new problem types in `src/lib/backend-types.ts` and `src/lib/error-codes.ts`; verify with client tests.
- [ ] 1.2 Build the "¿Hasta qué mes le pagaron?" component with its consequence block (D-1, D-2); verify month lists, no preselection, the late-fee sentence, and recomputation.
- [ ] 1.3 Use it in `CreationWizard` (and in the unified flow and the PDF review when those land), including the re-ask on `ELAPSED_INVOICES_DECISION_REQUIRED`; verify with component tests.
- [ ] 1.4 Label onboarding payments and hide their actions in the owner workspace, contract detail and tenant portal (D-3); verify with component tests.
- [ ] 1.5 Run lint and tests, and `openspec validate in-progress-contract-onboarding --strict`.
