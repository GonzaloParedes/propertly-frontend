# contract-onboarding-flow Specification

## Purpose
Let an owner load property, tenant and contract in one flow and one save, leaving nothing half-created.

## Requirements

### Requirement: New property and tenant are drafted inside the contract flow

In "Nuevo contrato", the property and tenant steps SHALL offer the owner's existing records and a new one. A new property or tenant SHALL be entered within the flow and kept as a draft. It SHALL NOT be saved before "Crear contrato". The review SHALL list what will be created, with a link to change each section.

#### Scenario: New tenant drafted
- **WHEN** the owner chooses "Un inquilino nuevo" and completes their data
- **THEN** no request creates the tenant, and the flow continues with "Inquilino nuevo: <nombre>" selected

#### Scenario: Review
- **WHEN** the owner reaches the review with a new property and an existing tenant
- **THEN** it shows "Propiedad nueva: <dirección>" and the existing tenant's name, each with "Cambiar"

### Requirement: Everything is saved in one request

"Crear contrato" SHALL send property, tenant, contract terms and the elapsed-installments answer in a single `POST /contracts/onboarding`, and SHALL be disabled while the request is in flight. Optional terms the owner skipped SHALL NOT be sent.

#### Scenario: Double click
- **WHEN** the owner clicks "Crear contrato" twice quickly
- **THEN** exactly one request is sent

### Requirement: Errors lead back to the step that holds them

A validation response SHALL be mapped by field path prefix (`property.`, `tenant.`, `contract.`) to the step holding each field. The flow SHALL go to the first such step, with each message next to its field. A duplicate-tenant conflict SHALL offer to use the existing tenant and resend. An active-contract conflict SHALL explain it and link to that contract.

#### Scenario: Two sections with errors
- **WHEN** the backend reports `property.street` and `contract.dueDay`
- **THEN** the flow opens the property sub-step with the street error, and the due-day error appears when the owner reaches that step

#### Scenario: Tenant already loaded
- **WHEN** the backend answers `409` with `existingTenantId` 7 for the drafted tenant's CUIT
- **THEN** the flow offers "Usar a <nombre>", and accepting it resends with tenant 7

### Requirement: Leaving creates no property or tenant

Closing the flow SHALL NOT leave any saved property or tenant: a new property or tenant drafted inside the flow exists only as part of the contract being loaded until "Crear contrato". What closing keeps of the contract being loaded, and when it asks for confirmation, is specified by `contract-drafts` ("Leaving keeps the draft").

#### Scenario: Abandon after drafting
- **WHEN** the owner drafts a new property and tenant, then closes the flow
- **THEN** no property or tenant exists on the server and the workspace is shown

### Requirement: First-contract entry in Inicio

When the owner has no contracts, Inicio's empty state SHALL offer "Cargar mi primer contrato" as its main action. The action SHALL open this flow, preceded by the PDF-or-manual choice when contract import is available.

#### Scenario: New account
- **WHEN** a newly registered owner opens Inicio
- **THEN** "Cargar mi primer contrato" is the main action and opens the flow
