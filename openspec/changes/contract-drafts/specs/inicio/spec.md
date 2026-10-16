# Spec Delta

## MODIFIED Requirements

### Requirement: Lo que requiere acción del propietario

The screen SHALL highlight the situations waiting for the owner's decision: payments uploaded by the tenant and not yet resolved, unconfirmed invoices, overdue invoices without payment, and contract drafts. Each invoice notice SHALL say which property it is about, for how much, and since when, and SHALL lead to where it is resolved. Each draft notice SHALL show the draft's label and when it was last edited, and SHALL offer "Continuar" and "Descartar" as specified by `contract-drafts`. When nothing is pending, invoices and drafts included, the section SHALL say so instead of disappearing without explanation.

#### Scenario: Un inquilino cargó un comprobante

- **WHEN** an invoice has a payment awaiting confirmation
- **THEN** the notice names the tenant and the property, and says the amount and how long it has been waiting
- **AND** it offers to go review it

#### Scenario: Una cuota está sin confirmar

- **WHEN** an invoice of the month was not confirmed by the owner
- **THEN** the notice explains that no payment can be recorded until it is confirmed

#### Scenario: Hay cuotas vencidas

- **WHEN** one or more invoices are overdue without payment
- **THEN** the notice groups them and states the total owed and how long ago they fell due

#### Scenario: Hay un contrato en borrador

- **WHEN** the owner has a contract draft labeled "Lavalle 950 · Pérez", last edited three days ago
- **THEN** the section shows a notice with that label and "editado hace 3 días", with "Continuar" and "Descartar"

#### Scenario: Sólo hay borradores pendientes

- **WHEN** no invoice requires action and the owner has one draft
- **THEN** the section shows the draft's notice and does not say that nothing is pending

#### Scenario: No hay nada pendiente

- **WHEN** no invoice requires action and the owner has no drafts
- **THEN** the screen says so explicitly

#### Scenario: Falta la fecha del comprobante

- **WHEN** a payment does not include the date it was uploaded
- **THEN** the notice is shown anyway, without the part about when
