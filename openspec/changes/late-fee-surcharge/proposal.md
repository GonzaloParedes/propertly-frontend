# Proposal

## Why

The contract form records late fees ("Punitorios por mora") as a percentage or fixed amount with grace days, but the app never acts on them: an overdue invoice shows its original amount, and the tenant learns about the surcharge only from the paper contract or from the landlord. The backend now computes the surcharge (backend change `late-fee-surcharge`, spec `invoice-late-fees`). The front has to collect terms it can compute from, and show both parties what is owed today, what it will be tomorrow, and when it starts.

## What Changes

- **BREAKING (with the backend)**: the contract form asks how the late fee is charged with an explicit unit: percent per day, per month or per year, a fixed amount per day, or a one-off fine. `lateFeeType` is replaced by `lateFeeMethod`. Contract detail describes the terms in words ("0,5 % diario sobre la cuota, desde el día 6 de atraso").
- Unconfirmed invoices are flagged to the owner in the workspace ("Sin confirmar: el inquilino todavía no puede pagarla"). On contracts with a late fee, the flag adds that the surcharge accrues per the contract anyway. This complements the backend's pending-confirmation emails.
- The tenant is emailed by the backend a few days before the grace period ends and when the surcharge starts; the portal shows the same information.
- Every invoice view (owner workspace, contract detail, tenant portal and its calendar) uses `amountDue` as the amount to pay and shows the surcharge as its own line, with its state.
  - Before it starts: "Desde el 16/10 se suma un recargo de $ 2.250 por día".
  - While accruing: "Hoy: $ 456.750 (incluye $ 6.750 de recargo). Desde mañana: $ 459.000".
  - Frozen: "Recargo calculado al 18/10, día en que se envió el comprobante".
- The landlord can waive the surcharge, reduce it to a fixed amount, or undo that from the invoice detail, and sees the surcharge before registering a payment, with the option to adjust it first.
- Data refreshes on the existing payment live-update events. Accruing amounts are re-read when the business day changes in Argentina, so a tab left open overnight never shows yesterday's amount.

## Capabilities

### New Capabilities

- `late-fees`: How late-fee terms are entered and described, how the surcharge and the amount due appear to landlords and tenants, and the landlord's waive/reduce action.

### Modified Capabilities

None at the requirement level. `portal-inquilino`, `detalle-contrato` and `ajuste-de-cuota` keep their requirements; the amount they display becomes `amountDue` per `late-fees`.

## Impact

- Front: `src/components/forms/ContractForm.tsx`, `src/components/dashboard/CreationWizard.tsx`, `src/components/dashboard/OwnerWorkspace.tsx`, `src/lib/contrato-detalle.ts`, `src/lib/backend-types.ts`, `src/lib/types.ts`, `src/lib/backend-client.ts`, `src/app/tenant-portal/`, and tests under `src/tests/`.
- Backend dependency: `propertly-backend` change `late-fee-surcharge`. Both must ship together because of the `lateFeeMethod` rename.
- Contract-from-PDF prototype (`prototipo/contrato-desde-pdf`): the "También figura en el contrato" group must map late-fee clauses to the new method.
