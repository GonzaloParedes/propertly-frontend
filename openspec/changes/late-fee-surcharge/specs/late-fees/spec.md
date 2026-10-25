# Spec Delta

## Purpose

Let owners record late-payment clauses in a form the backend can compute from, and show owners and tenants the surcharge an invoice carries: before it starts, while it grows, when it is fixed, and when it is paid.

## ADDED Requirements

### Requirement: The contract form records the late-fee method with its unit

The contract form (manual wizard and edit) SHALL offer the late-fee methods `PERCENT_PER_DAY`, `PERCENT_PER_MONTH`, `PERCENT_PER_YEAR`, `FIXED_PER_DAY` and `FIXED_ONCE` in plain words with an example each, a value field whose unit matches the method (`%` or the contract currency), and grace days explained as days after the due date. All three SHALL remain optional, and SHALL be sent as `lateFeeMethod`, `lateFeeValue` and `lateFeeGraceDays`. The form SHALL show the backend's validation errors next to the affected field.

#### Scenario: Daily percentage
- **WHEN** the owner chooses "Un porcentaje por día de atraso", enters 0,5 and 5 grace days
- **THEN** the request carries `lateFeeMethod` `PERCENT_PER_DAY`, `lateFeeValue` 0.5 and `lateFeeGraceDays` 5

#### Scenario: Unit follows the method
- **WHEN** the owner switches from a percentage method to "Una multa única" in a USD contract
- **THEN** the value field shows the amount in USD instead of `%`

#### Scenario: No late fee
- **WHEN** the owner leaves the section empty
- **THEN** no late-fee field is sent and the contract is created

### Requirement: Contract detail describes the terms in words

Contract detail SHALL describe the late-fee terms as one sentence built from the method, value and grace days, for example "0,5 % diario sobre la cuota, desde el día 6 de atraso", "5 % mensual, cobrado por día de atraso, desde el día 1 de atraso" or "Multa única de $ 20.000, desde el día 1 de atraso". A contract without a method SHALL show no late-fee line.

#### Scenario: Monthly rate
- **WHEN** a contract has `PERCENT_PER_MONTH` 5 and 0 grace days
- **THEN** the detail reads "5 % mensual, cobrado por día de atraso, desde el día 1 de atraso"

### Requirement: Owners see which invoices wait for their confirmation

The owner workspace and contract detail SHALL flag every unconfirmed invoice with icon and word, explaining that the tenant cannot pay it yet. When the invoice's due date has passed, the flag SHALL be shown as urgent. When its contract has a late-fee method, the flag SHALL add that the surcharge accrues per the contract even though the tenant cannot pay it in the portal yet, and show the current surcharge. The flag SHALL link to the existing confirm action.

#### Scenario: Unconfirmed past its due date with a late fee
- **WHEN** the owner opens the workspace on 12/10 and an invoice due on 10/10, of a contract with a late-fee method, is unconfirmed
- **THEN** the row shows an urgent "Sin confirmar" flag stating that the tenant cannot pay it in the portal while the surcharge accrues, with the current surcharge and a link to confirm it

### Requirement: Invoices show the surcharge and pay the amount due

Wherever an invoice amount is shown to the owner or the tenant (owner workspace rows, contract detail, tenant portal and its calendar), the amount to pay SHALL be `amountDue`. When `lateFee` is present and its `amount` is greater than 0, the surcharge SHALL appear as its own labelled line with icon and word. By `lateFee.state`:

- `NOT_STARTED`: show when it starts and what it adds, from `accruesFrom` and `nextDayAmount`.
- `ACCRUING`: show today's amount due and, when `nextDayAmount` differs from `amount`, the amount due from tomorrow.
- `FROZEN`: show that the surcharge was calculated on `asOf`, the day the receipt was sent.
- `SETTLED`: show the surcharge that was paid.

`overridden` SHALL be shown to the owner as "Recargo modificado" or "Recargo perdonado". The front SHALL NOT compute surcharge amounts itself.

#### Scenario: Accruing in the tenant portal
- **WHEN** the tenant opens an invoice with `amountDue` 456,750, `lateFee.amount` 6,750 and `nextDayAmount` 9,000
- **THEN** the portal shows "Hoy: $ 456.750", the line "Recargo por atraso $ 6.750", and "Desde mañana: $ 459.000"

#### Scenario: Before the surcharge starts
- **WHEN** the invoice has `state` `NOT_STARTED`, `accruesFrom` 16/10 and `nextDayAmount` 2,250
- **THEN** the tenant sees "Desde el 16/10 se suma un recargo de $ 2.250 por día" and the amount to pay is the plain total

#### Scenario: Frozen by a receipt
- **WHEN** the invoice has `state` `FROZEN` and `asOf` 18/10
- **THEN** no "Desde mañana" line is shown and the surcharge is labelled as calculated on 18/10

### Requirement: Accruing amounts stay current in an open page

The front SHALL re-read invoices whose surcharge is `NOT_STARTED` or `ACCRUING` when the date in Argentina changes while the page is open, in addition to the existing `connected` and `payment-updated` events.

#### Scenario: Tab left open past midnight
- **WHEN** the tenant portal stays open from 23:50 to 00:05 Argentina time on an accruing invoice
- **THEN** after midnight the portal shows the new day's amount without a manual reload

### Requirement: Owners can waive, change, or restore the surcharge

The owner's invoice detail SHALL offer, on unpaid invoices of a contract with a late-fee method, "Perdonar recargo" (`PUT /invoices/{id}/late-fee` with amount 0), "Cambiar el recargo" (an amount between 0 and today's surcharge), and, when overridden, "Volver a calcular" (`DELETE`). The register-payment dialog SHALL show the surcharge that the registration will settle, with a link to change it first. A `409` from the backend SHALL be shown with the existing error handling.

#### Scenario: Waive before registering a cash payment
- **WHEN** the owner opens "Registrar pago" on an invoice with a 6,750 surcharge, chooses "Cambiar", waives it and registers the payment
- **THEN** the invoice is paid for the plain total and shows "Recargo perdonado"

#### Scenario: Amount above today's surcharge
- **WHEN** the owner types 10,000 for a surcharge of 6,750
- **THEN** the form prevents submission and explains the maximum
