# Spec Delta

## ADDED Requirements

### Requirement: The contract flow becomes a draft with the owner's first own input

In "Nuevo contrato", the flow SHALL become a draft the first time any of these happens:
- the location of a new property becomes complete: street, number, city and province, whether they came from the chosen search result or the owner completed them by hand;
- the owner fills any field of a new tenant;
- the owner moves past the first step with "Seguir". When the flow opens with the property already chosen (from the property's detail), its first step is the tenant step.

Opening the flow, choosing one of the owner's existing properties or tenants, typing in the address search without choosing a result, and a new property's location left incomplete SHALL NOT make the flow a draft. Completing the location SHALL create the draft right away, without waiting for the owner to stop typing. Once the flow is a draft it SHALL remain one, even if the owner later clears what made it one. Becoming a draft SHALL NOT create any property, tenant or contract.

The draft's label SHALL name the property and the tenant when known (for example "Lavalle 950 · Pérez"), and otherwise whichever of them is known, or "Contrato sin propiedad ni inquilino". A new property SHALL count as known once its location is complete, even before it is confirmed. The label SHALL follow later changes to the property or tenant.

#### Scenario: Location complete from the search
- **WHEN** the owner opens "Nuevo contrato", chooses "Una propiedad nueva" and chooses the search result "Lavalle 950, Morón, Buenos Aires"
- **THEN** a draft labeled "Lavalle 950" exists right away, and no property, tenant or contract was created

#### Scenario: Location completed by hand
- **WHEN** the owner chooses the search result "Lavalle, Morón, Buenos Aires", which has no number
- **THEN** no draft exists yet
- **AND** when the owner types "950" as the number, a draft labeled "Lavalle 950" exists right away

#### Scenario: Opened by mistake
- **WHEN** the owner opens "Nuevo contrato" and closes it without entering anything
- **THEN** no draft exists

#### Scenario: Existing property
- **WHEN** the owner chooses one of their existing properties on the first step and closes the flow without moving on
- **THEN** no draft exists

#### Scenario: Address search only
- **WHEN** the owner types "Lavalle" in the address search of a new property, chooses no result, and closes the flow
- **THEN** no draft exists

#### Scenario: Incomplete location
- **WHEN** the owner chooses the search result "Lavalle, Morón, Buenos Aires", leaves the number empty, and closes the flow
- **THEN** no draft exists and the flow closes without any dialog

#### Scenario: New tenant
- **WHEN** the owner types the first name of a new tenant and closes the flow
- **THEN** a draft exists and holds that first name

#### Scenario: Past the first step
- **WHEN** the owner chooses their existing property "Lavalle 950" and moves to the tenant step
- **THEN** a draft labeled "Lavalle 950" exists, and no property, tenant or contract was created

## MODIFIED Requirements

### Requirement: A draft saves itself

Once the flow is a draft, it SHALL save everything entered without any action from the owner: on every step change, including the steps of a new property or tenant being loaded, shortly after the owner stops typing, and one last time when the page is closed or hidden. A save SHALL keep everything entered so far, including:
- incomplete steps;
- drafted new properties and tenants;
- the fields of a new property or tenant being loaded, even if it was not confirmed with "Usar esta propiedad" or "Usar este inquilino";
- the "Otras condiciones" values;
- where the owner is: the contract step and, while loading a new property or tenant, which of them and on which of its steps.

Text typed in the address search without choosing a result SHALL NOT be kept. Every save SHALL update the same draft. Saves SHALL NOT create any property, tenant or contract.

#### Scenario: Leaves the adjustment for later
- **WHEN** the owner chose a property and a tenant, entered the rent and term, and closes the tab on the adjustment step
- **THEN** the draft holds the property, tenant, rent and term, and reopens on the adjustment step

#### Scenario: New property half loaded
- **WHEN** the owner completes three of the four steps of a new property and closes the tab on the fourth
- **THEN** the draft holds everything entered in those three steps, and where the owner was: the new property's fourth step

#### Scenario: Typing within a step
- **WHEN** the owner types the rent and stops typing for a couple of seconds without changing step
- **THEN** the draft holds the typed rent

#### Scenario: Resumed and edited
- **WHEN** the owner resumes a draft and changes the rent
- **THEN** the same draft is updated and no second draft appears

### Requirement: The flow shows whether the draft is saved

Once the flow is a draft, or is trying to become one, its header SHALL show the save state: saving, saved, or not saved. When a save fails, including the first save that creates the draft, the indicator SHALL say so, and the flow SHALL retry and keep everything entered on screen. Retrying the creation SHALL NOT produce more than one draft. Failures SHALL be announced to assistive technologies; successful saves SHALL NOT be announced. When the draft cannot be saved because the owner reached the draft limit, the indicator SHALL say why, and the flow SHALL keep working without saving.

#### Scenario: No connection
- **WHEN** a save fails because the network is down
- **THEN** the header says the draft could not be saved, the entered values stay on screen, and the next successful save shows it as saved

#### Scenario: Draft could not be created
- **WHEN** the owner completes the location of a new property while the network is down
- **THEN** the header says the draft could not be saved, the location stays on screen, and the flow retries
- **AND** once the network is back, exactly one draft exists, holding the location

#### Scenario: Limit reached from another device
- **WHEN** the owner already has the maximum number of drafts (for example, the last one was saved on another device after this flow opened) and starts loading a new property
- **THEN** no draft is created, and the header says the contract is not saved as a draft because the owner already has the maximum

### Requirement: Leaving keeps the draft

Closing a flow that is a draft SHALL NOT ask for confirmation. It SHALL save any unsaved changes, close, and show a message saying that the contract was kept as a draft and that it can be found in Inicio. If that last save fails, the flow SHALL warn in an in-app dialog, before closing, that the latest changes would be lost. Closing a flow with nothing of the owner's own entered SHALL just close, without any dialog. When the owner's own input exists but the flow could not become a draft, because the owner reached the draft limit or because creating the draft failed, closing SHALL ask for confirmation in an in-app dialog that says the work was not kept and why. In no other case SHALL closing ask for confirmation.

#### Scenario: Leave a draft
- **WHEN** the owner is on the rent step of a draft and closes the flow
- **THEN** the flow closes without a question, and a message says the contract was kept as a draft in Inicio

#### Scenario: Leave before the first step is done
- **WHEN** the owner completed a new property's location, is on that new property's second step, and closes the flow
- **THEN** the flow closes without a question, and a message says the contract was kept as a draft in Inicio

#### Scenario: Leave without own input
- **WHEN** the owner opens "Nuevo contrato", chooses one of their existing properties, and closes the flow from the first step
- **THEN** the flow closes without any dialog and no draft exists

#### Scenario: Leave at the limit
- **WHEN** the owner already has the maximum number of drafts, typed a new tenant's name, and closes the flow
- **THEN** a dialog says the work was not kept because the owner already has the maximum of drafts, and asks for confirmation

### Requirement: Drafts can be resumed from Inicio, Contratos and "Nuevo contrato"

The owner's drafts SHALL appear in Inicio (as specified by `inicio`) and in a "Borradores" group at the top of Contratos. Each SHALL show its label and when it was last edited, with "Continuar" and "Descartar". The group SHALL NOT appear when there are no drafts. "Continuar" SHALL open the flow exactly where the draft was saved, with everything it held: on its contract step or, when the owner was loading a new property or tenant, on that new property's or tenant's step, with what was entered in it. "Nuevo contrato" SHALL, when drafts exist, first offer to continue one of them or start a new contract. When the owner has the maximum number of drafts, starting a new contract SHALL NOT be offered, and the screen SHALL say why.

#### Scenario: Resume on another device
- **WHEN** the owner saved a draft on the adjustment step on their laptop and taps "Continuar" in Inicio on their phone
- **THEN** the flow opens on the adjustment step with the property, tenant, rent and term already filled

#### Scenario: Resume a half-loaded property
- **WHEN** the owner closed the tab on the fourth step of a new property and later taps "Continuar" on that draft
- **THEN** the flow opens on that new property's fourth step, with the address and everything else entered in the first three steps

#### Scenario: New contract with a draft pending
- **WHEN** the owner has one draft and opens "Nuevo contrato"
- **THEN** the flow first offers to continue "Lavalle 950 · Pérez" or start a new contract

#### Scenario: At the limit
- **WHEN** the owner has 3 drafts and opens "Nuevo contrato"
- **THEN** only continuing one of them is offered, with an explanation that 3 is the maximum and one must be finished or discarded

### Requirement: Incomplete steps are listed in the review

A step SHALL NOT let the owner move on while its required data is missing or invalid, and the flow SHALL NOT offer any way to skip it. A resumed draft MAY still hold an incomplete step: what a saved choice pointed to is no longer available (an archived tenant, a property that now has an active contract), or the elapsed-installments question no longer matches the dates. The review SHALL list each incomplete step with a link to it. "Crear contrato" SHALL NOT be available while any step is incomplete, and the review SHALL say why. A step that depends on incomplete data, such as the elapsed-installments question when the start date or term is incomplete, SHALL be shown as incomplete until that data is complete. An owner who lacks a required datum SHALL be able to leave the flow and resume the draft later on the same step.

#### Scenario: Saved tenant no longer available
- **WHEN** the owner resumes a draft whose tenant was archived meanwhile, and reaches the review
- **THEN** the review lists "Inquilino" as incomplete with a link, and "Crear contrato" is unavailable with the reason stated

#### Scenario: Incomplete step completed
- **WHEN** the owner follows that link, chooses another tenant and returns to the review
- **THEN** nothing is incomplete and "Crear contrato" is available

#### Scenario: A missing datum cannot be skipped
- **WHEN** the owner is on the rent step without having entered the rent
- **THEN** the flow offers "Seguir", unavailable until the rent is valid, and no other way to move on

#### Scenario: Leaving a step to finish it later
- **WHEN** the owner does not have the rent at hand, leaves the flow on the rent step, and resumes the draft the next day
- **THEN** the flow reopens on the rent step with everything else already filled

## REMOVED Requirements

### Requirement: Steps can be completed later

**Reason**: A button that moves on without the required data next to one that only works with it was confusing, and it is no longer needed: the draft is saved from the first own input, so the owner can leave a step and resume it later. Replaced by "Incomplete steps are listed in the review", which keeps the review list for the cases that remain.

**Migration**: Nothing to migrate. Pending steps were never stored in the draft; they are derived from its data when it is opened.

### Requirement: The contract flow becomes a draft after its first step

**Reason**: Work entered inside the first step, such as a new property half loaded, was lost when the owner left before moving on. Replaced by "The contract flow becomes a draft with the owner's first own input".

**Migration**: Nothing to migrate. Drafts saved under the old rule keep working; their payload is read as described in `design.md` (D-2).
