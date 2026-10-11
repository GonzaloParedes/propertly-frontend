# Spec Delta

## Purpose

Let the owner load a running lease saying which past installments were collected, see what that means before creating it, and recognize those installments afterwards.

## ADDED Requirements

### Requirement: Backdated contracts ask up to which month the installments were collected

Every contract-creation flow (manual wizard, unified flow, PDF review) SHALL, when the contract has elapsed installments, ask "¿Hasta qué mes le pagaron?" before creating. The options SHALL be each elapsed month and "Ninguno todavía", with none preselected. The flow SHALL send the answer as `elapsed.paidThrough` (`yyyy-MM` or `null`). It SHALL NOT allow creating until the owner answers. When the backend reports `ELAPSED_INVOICES_DECISION_REQUIRED`, the flow SHALL ask again with the periods the backend returned.

#### Scenario: Lease started in June, created on 10 October with due day 10
- **WHEN** the owner reaches the question
- **THEN** the options are junio, julio, agosto, septiembre 2026 and "Ninguno todavía", and "Crear contrato" stays disabled until one is chosen

#### Scenario: Not backdated
- **WHEN** the lease starts this month with a due date still ahead
- **THEN** the question is not shown

### Requirement: The consequence is explained before creating

Under the answer, the flow SHALL state:

- which months remain as collected without receipt;
- which months remain as debt, and their total;
- that the tenant will receive the overdue notice for them;
- when the contract has a late fee, that the surcharge starts counting from today.

The review step SHALL repeat this summary.

#### Scenario: Paid through August with a late fee
- **WHEN** the owner chooses agosto, the rent is 450,000 and the contract has a late fee
- **THEN** the block says junio to agosto stay collected without receipt, septiembre stays as debt for $ 450.000, the tenant will be notified, and the surcharge starts today

### Requirement: Onboarding payments are labelled and inert

Wherever payments are shown to the owner or the tenant, a payment with `origin` `ONBOARDING` SHALL read "Registrado al dar de alta · sin comprobante". It SHALL show no receipt link and SHALL offer no confirm, reject or attach action.

#### Scenario: Tenant portal
- **WHEN** the tenant opens the June installment
- **THEN** it shows as paid with that label and no receipt link
