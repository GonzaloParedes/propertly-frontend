# Design

## Context

- **What counts as elapsed:** the backend rejects a backdated contract without `elapsed.paidThrough`, returning `ELAPSED_INVOICES_DECISION_REQUIRED` with the list of elapsed periods. An elapsed installment is one whose due date is before the creation date.
- **Collected installments:** each gets a payment with `origin: ONBOARDING` and `hasReceipt: false`.
- **Installments left as debt:** they are overdue. When the contract has a late fee, their surcharge starts the day after creation.

## Decisions

### D-1. Where and how the question appears

The question appears right after the start date and term are known: after "Plazo" in the wizard and the unified flow, and as an item of the PDF review. It is computed in the client from start date, due day and today. If the backend still answers with `ELAPSED_INVOICES_DECISION_REQUIRED`, for example around midnight, the flow uses the periods it returns and asks again.

The control is a list of month options, from the first elapsed month to the last, plus "Ninguno todavía". Nothing is preselected: the owner must choose.

### D-2. The consequence, before creating

Under the choice, one short block:

> "Junio a agosto quedan como cobradas (sin comprobante). Septiembre queda como deuda: $ 450.000. Su inquilino va a recibir el aviso de cuota vencida. El recargo por atraso empieza a correr desde hoy."

The last sentence appears only when the contract has a late fee. The block is recomputed whenever the choice, rent or dates change. The review step repeats it in its summary.

### D-3. Onboarding payments in every list

Owner workspace rows, contract detail and the tenant portal show onboarding payments as paid, with "Registrado al dar de alta · sin comprobante". They show no receipt link and no confirm, reject or attach action. The label follows the icon-plus-word rule.

## Risks / Trade-offs

- **Client-computed elapsed months can differ from the server's at the day boundary.** It is handled by re-asking with the server's list (D-1).
