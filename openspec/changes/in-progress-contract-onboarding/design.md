# Design

## Context

- **What counts as elapsed:** the backend rejects a backdated contract without `elapsed.paidThrough`, returning `ELAPSED_INVOICES_DECISION_REQUIRED` with the list of elapsed periods. An elapsed installment is one whose due date is before the creation date.
- **Collected installments:** each gets a payment with `origin: ONBOARDING` and `hasReceipt: false`.
- **Installments left as debt:** they are overdue. When the contract has a late fee, their surcharge starts the day after creation.

## Decisions

### D-1. Where and how the question appears

The question appears on the review screen, under the summary. In the wizard it is not placed right after "Plazo" because the debt total depends on the update frequency, which is chosen on the step that follows "Plazo"; on the review screen every input is final. The same holds for the unified flow, and in the PDF review it is an item of the review. It is computed in the client from start date, term, due day and today in Argentina (`src/lib/transcurridos.ts`): a period is elapsed when it starts before the contract ends and its due date falls before today. If the backend still answers with `ELAPSED_INVOICES_DECISION_REQUIRED`, for example around midnight or in an index contract whose later months have no published value, the flow uses the periods it returns in `errors.elapsed`, clears the answer and asks again.

The control is a list of month options, from the first elapsed month to the last, plus "Ninguno todavía". Nothing is preselected: the owner must choose. An answer that no longer matches any month, because the dates changed, counts as unanswered.

### D-2. The consequence, before creating

Under the choice, one short block:

> "Junio a agosto quedan como cobradas (sin comprobante). Septiembre queda como deuda: $ 450.000. Su inquilino va a recibir el aviso de cuota vencida. El recargo por atraso empieza a correr desde hoy."

The last sentence appears only when the contract has a late fee and some debt remains. The total appears only when every month left as debt falls before the first rent increase (`incrementFrequencyMonths` from the start): from then on the amount is computed by the backend, and in an index contract it does not even exist yet, so stating a total would invent it. Without it the sentence reads "Septiembre queda como deuda." The block is recomputed whenever the choice, rent or dates change.

### D-3. Onboarding payments in every list

Owner workspace rows and the tenant portal show onboarding payments as paid, with "Registrado al dar de alta · sin comprobante". They show no receipt link and no confirm, reject or attach action. The label follows the icon-plus-word rule.

## Risks / Trade-offs

- **Client-computed elapsed months can differ from the server's at the day boundary and in index contracts.** It is handled by re-asking with the server's list (D-1).
- **A contract that starts today can still ask the question.** The backend counts the current month's installment as elapsed when its due day has already passed, even if the contract starts after it, so the question appears for them too.
