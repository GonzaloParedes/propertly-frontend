# Design

## Context

The backend (`propertly-backend`, change `late-fee-surcharge`) computes the surcharge at read time and returns, on every invoice, `lateFee` (`method`, `value`, `accruesFrom`, `asOf`, `daysLate`, `amount`, `nextDayAmount`, `state`, `overridden`) and `amountDue`. Accrual is simple daily interest after the grace period. A submitted payment freezes it on its submission date, and payment settles it. Days change at Argentina midnight. The front never computes the surcharge.

## Decisions

### D-1. The method question is asked in the owner's words

The form asks "¿Cómo se cobra el atraso?" with five options, each with an example taken from typical clauses:

| Option | Example shown | `lateFeeMethod` |
|---|---|---|
| Un porcentaje por día de atraso | "0,5 % por día" | `PERCENT_PER_DAY` |
| Un porcentaje mensual, proporcional a los días | "5 % mensual" | `PERCENT_PER_MONTH` |
| Una tasa anual, proporcional a los días | "60 % anual" | `PERCENT_PER_YEAR` |
| Un monto fijo por día de atraso | "$ 5.000 por día" | `FIXED_PER_DAY` |
| Una multa única | "$ 20.000 una sola vez" | `FIXED_ONCE` |

Grace days are labelled "Días de gracia después del vencimiento", with the help text "Días en los que todavía puede pagar sin recargo. Si el contrato dice «del 1 al 10», el vencimiento es el 10 y los días de gracia son 0." This answers the most common confusion: the due date and the grace period are not the same thing.

### D-2. Today and tomorrow, never a formula

The tenant sees amounts, not rates: "Hoy" and "Desde mañana" from `amount`/`amountDue` and `nextDayAmount`. The surcharge line uses the domain's pill rule (icon + word): "Recargo por atraso". When `nextDayAmount` equals `amount`, the "Desde mañana" line is omitted. The rule that freezes the amount is stated once, next to the receipt upload: "El importe queda fijo el día en que envía el comprobante."

### D-3. No client-side math, and a day-change refresh

Showing an amount computed in the browser could disagree with the server on rounding or on the time zone. The front only displays server values, and re-reads invoices in an `ACCRUING` or `NOT_STARTED` state when the Argentina date changes while the page is open, as well as on the existing `connected`/`payment-updated` events.

### D-4. Waive and reduce live in the invoice detail

They sit next to the existing adjustment actions as "Perdonar recargo" and "Cambiar el recargo". The amount field is capped at today's amount, and the action can be undone with "Volver a calcular". In the register-payment dialog the surcharge is shown with a "Cambiar" link, because registering a payment settles it.
