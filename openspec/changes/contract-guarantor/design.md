# Design

## Context

The backend accepts `guarantees` (at most 3) on contract create, update and onboarding. Each entry has a `type` and only that type's fields:

| Type | Fields |
|---|---|
| `PERSONAL` | `fullName` required; `taxId`, `phoneNumber`, `email`, `address`, `employer` optional |
| `PROPERTY` | `fullName` and `propertyAddress` required; `taxId`, `phoneNumber`, `email`, `address`, `propertyRegistry` optional |
| `SURETY_INSURANCE` | `insurerName` required; `policyNumber` optional |

Updating replaces the whole list. `depositType` no longer exists.

## Decisions

### D-1. One card per guarantee, type first

"Agregar una garantía" first asks the type, as three option cards with the plain-language names, then shows that type's fields.

- Changing the type of an entered guarantee keeps the fields both types share and clears the rest, warning when data would be lost.
- With three guarantees, the add action is hidden and a note states the limit.

CUIT and phone reuse the existing formatting and digit-only submission (`src/lib/cuit.ts`, `src/lib/telefono.ts`), as the tenant form does.

### D-2. Short, sectioned fields

Each card shows the required fields first and "Agregar más datos" for the optional ones, following the rule against long forms with every field visible.

### D-3. Sentences in the detail

`contrato-detalle.ts` builds one line per guarantee:

- "Garante con recibo de sueldo: <nombre> (CUIT …) · <teléfono> · trabaja en <empleador>"
- "Garantía propietaria de <nombre>: <dirección>, matrícula <n>"
- "Seguro de caución: <aseguradora>, póliza <n>"

Missing optional parts are omitted.
