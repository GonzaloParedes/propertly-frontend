# Tasks

## 1. Types and client

- [x] 1.1 Replace `lateFeeType` with `lateFeeMethod` in `src/lib/backend-types.ts` and `src/lib/types.ts`; add `lateFee` and `amountDue` to the invoice type; add `setLateFee`/`clearLateFee` to `src/lib/backend-client.ts`; verify with client tests.

## 2. Contract terms

- [>] 2.1 Moved to `contract-onboarding-flow` task 1.3b: the real contract form is `CreationWizard`'s "Otras condiciones" step, and `ContractForm` is a mockup with no endpoint.
- [x] 2.2 Rewrite `agregarPunitorios` in `src/lib/contrato-detalle.ts` to describe the method in words; verify with unit tests.

## 3. Invoice views

- [x] 3.1 (contract detail lists no invoice amounts today, so it only gets the 3.3 flag) Use `amountDue` and render the surcharge line by `state` in the owner workspace rows, contract detail, tenant portal and calendar; verify with component tests for each state, overridden, and `lateFee: null`.
- [x] 3.2 Re-read accruing invoices on Argentina date change (plus the existing live-update events); verify with fake timers.
- [x] 3.3 Flag unconfirmed invoices (urgent past the due date, late-fee wording when applicable, link to confirm) in the workspace and contract detail; verify with component tests.

## 4. Owner actions

- [x] 4.1 Add "Perdonar recargo", "Cambiar el recargo" and "Volver a calcular" to the invoice detail, and the surcharge preview with "Cambiar" in the register-payment dialog; verify with component tests, including the maximum and the `409` path.

## 5. Gate

- [x] 5.1 Update `docs/design/sistema-ui.md` if a new pattern is introduced, run lint and tests, and validate with `openspec validate late-fee-surcharge --strict`.
