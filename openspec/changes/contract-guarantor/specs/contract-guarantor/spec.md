# Spec Delta

## Purpose

Let owners record and see who guarantees each lease, in the forms Argentine leases use.

## ADDED Requirements

### Requirement: Owners enter up to three typed guarantees

The contract form and the creation flow's "Otras condiciones" step SHALL let the owner add up to three guarantees. Each SHALL start by choosing its type in plain words: "Un garante con recibo de sueldo", "Un garante con propiedad (garantía propietaria)" or "Un seguro de caución". Each SHALL show only that type's fields, required ones first. The section SHALL be optional. The form SHALL send the list as `guarantees`, and SHALL show backend validation errors next to the affected field.

#### Scenario: Property guarantee
- **WHEN** the owner adds "Un garante con propiedad", enters the name and the property's address, and saves
- **THEN** the request carries one `PROPERTY` guarantee with `fullName` and `propertyAddress`

#### Scenario: Limit
- **WHEN** three guarantees are entered
- **THEN** "Agregar una garantía" is hidden and the form states that three is the maximum

#### Scenario: Removing all
- **WHEN** the owner removes every guarantee of an existing contract and saves
- **THEN** the update sends `guarantees: []`

### Requirement: Contract detail describes guarantees, and the deposit is its amount only

Contract detail SHALL show one sentence per guarantee, built from its type and fields and omitting missing optional parts. The deposit-type selector and its display SHALL be removed. The tenant portal SHALL NOT show guarantees.

#### Scenario: Surety insurance
- **WHEN** a contract has a `SURETY_INSURANCE` guarantee from "Aseguradora Sur" with policy 4411
- **THEN** the detail reads "Seguro de caución: Aseguradora Sur, póliza 4411"
