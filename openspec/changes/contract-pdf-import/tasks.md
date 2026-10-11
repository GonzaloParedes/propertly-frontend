# Tasks

## 1. Client and types

- [ ] 1.1 Add `contractImports` to `src/lib/backend-client.ts` (`quota`, `upload`, `get`, `retry`, `complete`, `discard`, `document`) and its types in `src/lib/backend-types.ts`; map the new problem types in `src/lib/error-codes.ts`; verify with client tests.

## 2. Entry and upload

- [ ] 2.1 Bring `ContractFromPdf.tsx` and the `CreationWizard` entry choice from `prototipo/contrato-desde-pdf`, outside `demo` mode, with the quota-aware option; verify with component tests for available, used up, and unavailable.
- [ ] 2.2 Upload screen with pre-checks and the rejection messages; verify one test per rejection.

## 3. Waiting

- [ ] 3.1 Polling, the progress list driven by backend stages, `aria-live`, cancel, 90 s notice, failure exits and retry (D-2); verify with fake timers and each stage.

## 4. Review

- [ ] 4.1 Map the result to review items (D-4), including unsupported reasons and matches (D-5); verify each state and resolution.
- [ ] 4.2 PDF page viewer with `pdfjs-dist` (pinned, lazy-loaded, eval disabled) and "Ver en el contrato" (D-3), with the narrow-screen variant; verify with component tests.
- [ ] 4.3 Footer counter, the elapsed-installments question (reuse `PagosTranscurridos` and `src/lib/transcurridos.ts` from `in-progress-contract-onboarding`), and the "Crear contrato" enablement rules; verify with component tests.

## 5. Create and leave

- [ ] 5.1 Create through `contract-onboarding-flow`, then complete with field actions, with a single retry and the attach-later fallback (D-6); verify both paths.
- [ ] 5.2 Leave-confirmation dialog and discard (D-7); verify with a test.

## 6. Gate

- [ ] 6.1 Update `docs/design/sistema-ui.md` (new patterns: source viewer, review states) and mark R5 as superseded in `docs/design/propuesta-contrato-desde-pdf.md`.
- [ ] 6.2 Run lint and tests, and `openspec validate contract-pdf-import --strict`.
