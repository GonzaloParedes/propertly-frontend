# Proposal

## Why

Loading a lease that started months ago creates every past installment, and today they all appear as the tenant's debt. The prototype found 19 overdue installments for a lease started in March 2025. The backend (`propertly-backend` change `in-progress-contract-onboarding`) now requires the owner to say up to which month the installments were collected. The front has to ask it clearly, show the consequence, and show the result honestly wherever payments appear.

## What Changes

- When the start date is in the past, the contract flows (manual wizard, unified flow, PDF review) ask "¿Hasta qué mes le pagaron?". The owner picks one of the elapsed months, or "Ninguno todavía", and the flow does not choose for them. This follows prototype decision R4, refined to "paid through a month" on 2026-10-10.
- Under the answer, the consequence in plain words:
  - which months stay as collected (without receipt);
  - which stay as debt, and the total;
  - that the tenant will get the overdue notice for the debt;
  - when the contract has a late fee, that the surcharge starts counting from today.
- Payments recorded at onboarding read "Registrado al dar de alta · sin comprobante" in the owner's views and the tenant portal, with no receipt link and no actions.

## Capabilities

### New Capabilities

- `in-progress-contract-onboarding`: Asking which elapsed installments were collected, explaining the consequence, and showing onboarding payments.

### Modified Capabilities

None at the requirement level. Payment and portal views gain a label for onboarding payments.

## Impact

- Front:
  - The question component, used by `CreationWizard`, the unified flow (`contract-onboarding-flow`) and the PDF review (`contract-pdf-import`).
  - Payment rows in the owner workspace, contract detail and tenant portal.
  - `src/lib/backend-types.ts` (`elapsed`, payment `origin` and `hasReceipt`) and `src/lib/error-codes.ts`.
- Backend dependency: `in-progress-contract-onboarding`, which also changes how contracts are created (**BREAKING** for backdated contracts without the answer).
