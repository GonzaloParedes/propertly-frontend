# Tasks

- [x] 1.1 Add `elapsed` to the contract-creation types, payment `origin`/`hasReceipt`, and the new problem types in `src/lib/backend-types.ts` and `src/lib/error-codes.ts`; verify with client tests.
- [x] 1.2 Build the "¿Hasta qué mes le pagaron?" component with its consequence block (D-1, D-2); verify month lists, no preselection, the late-fee sentence, and recomputation.
- [x] 1.3 Use it in `CreationWizard`, on its review screen (see D-1), including the re-ask on `ELAPSED_INVOICES_DECISION_REQUIRED`; verify with component tests.
- [>] 1.3b Moved: the unified flow (`contract-onboarding-flow` task 1.4b) and the PDF review (`contract-pdf-import` task 4.3) reuse `PagosTranscurridos` and `src/lib/transcurridos.ts`, and wire `tieneRecargo` once "Otras condiciones" loads the late fee.
- [x] 1.4 Label onboarding payments and hide their actions in the owner workspace and tenant portal (contract detail lists no payments) (D-3); verify with component tests.
- [x] 1.5 Run lint and tests, and `openspec validate in-progress-contract-onboarding --strict`.
