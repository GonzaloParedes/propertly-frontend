# Spec Delta

## Purpose

Let an owner who does not have every term of a lease at hand save the contract as a draft, with steps left for later and optionally its signed PDF, find it again from any device, and finish or discard it, so that unfinished work is neither lost nor left behind forever.

## ADDED Requirements

### Requirement: The contract flow becomes a draft after its first step

In "Nuevo contrato", the flow SHALL become a draft the first time the owner moves past the property step, whether by "Siguiente" or "Completar después". Before that, nothing SHALL be saved. Becoming a draft SHALL NOT create any property, tenant or contract. The draft's label SHALL name the property and the tenant when known (for example "Lavalle 950 · Pérez"), and otherwise whichever of them is known, or "Contrato sin propiedad ni inquilino". The label SHALL follow later changes to the property or tenant.

#### Scenario: Opened by mistake
- **WHEN** the owner opens "Nuevo contrato" and closes it from the property step
- **THEN** no draft exists

#### Scenario: Past the first step
- **WHEN** the owner chooses "Lavalle 950" and moves to the tenant step
- **THEN** a draft labeled "Lavalle 950" exists, and no property, tenant or contract was created

### Requirement: A draft saves itself

Once the flow is a draft, it SHALL save everything entered without any action from the owner: on every step change, shortly after the owner stops typing, and one last time when the page is closed or hidden. A save SHALL keep everything entered so far, including incomplete steps, drafted new properties and tenants, the "Otras condiciones" values, the pending steps and the step the owner is on. Every save SHALL update the same draft. Saves SHALL NOT create any property, tenant or contract.

#### Scenario: Leaves the adjustment for later
- **WHEN** the owner chose a property and a tenant, entered the rent and term, and closes the tab on the adjustment step
- **THEN** the draft holds the property, tenant, rent and term, and reopens on the adjustment step

#### Scenario: Typing within a step
- **WHEN** the owner types the rent and stops typing for a couple of seconds without changing step
- **THEN** the draft holds the typed rent

#### Scenario: Resumed and edited
- **WHEN** the owner resumes a draft and changes the rent
- **THEN** the same draft is updated and no second draft appears

### Requirement: The flow shows whether the draft is saved

While the flow is a draft, its header SHALL show the save state: saving, saved, or not saved. When a save fails, the indicator SHALL say so, and the flow SHALL retry and keep everything entered on screen. Failures SHALL be announced to assistive technologies; successful saves SHALL NOT be announced. When the draft cannot be saved because the owner reached the draft limit, the indicator SHALL say why.

#### Scenario: No connection
- **WHEN** a save fails because the network is down
- **THEN** the header says the draft could not be saved, the entered values stay on screen, and the next successful save shows it as saved

#### Scenario: Limit reached from another device
- **WHEN** the flow tries to become a draft while the owner already has the maximum number of drafts
- **THEN** the header says the contract cannot be saved as a draft until one is finished or discarded

### Requirement: Leaving keeps the draft

Closing a flow that is a draft SHALL NOT ask for confirmation. It SHALL save any unsaved changes, close, and show a message saying that the contract was kept as a draft and that it can be found in Inicio. Closing a flow that is not yet a draft, with something entered, SHALL ask for confirmation in an in-app dialog stating that nothing was saved. Closing with nothing entered SHALL just close.

#### Scenario: Leave a draft
- **WHEN** the owner is on the rent step of a draft and closes the flow
- **THEN** the flow closes without a question, and a message says the contract was kept as a draft in Inicio

#### Scenario: Leave before the first step is done
- **WHEN** the owner typed a new property's street and closes from the property step
- **THEN** a dialog says nothing was saved and asks for confirmation

### Requirement: A draft can be discarded from the flow

While the flow is a draft, its header SHALL offer "Descartar borrador". It SHALL follow "Discarding a draft is confirmed" and, once confirmed, SHALL delete the draft and close the flow.

#### Scenario: Discard while editing
- **WHEN** the owner taps "Descartar borrador" in the flow and confirms
- **THEN** the flow closes and the draft no longer appears in Inicio or Contratos

### Requirement: Steps can be completed later

On a step whose required data is missing or invalid, the flow SHALL offer "Completar después" in addition to the normal action. Choosing it SHALL move to the next step, keep what was entered, and mark the step as pending. The review SHALL list each pending step with a link to it. "Crear contrato" SHALL NOT be available while any step is pending, and the review SHALL say why. A step that depends on pending data, such as the elapsed-installments question when the start date or term is pending, SHALL be shown as pending until that data is complete.

#### Scenario: Adjustment left for later
- **WHEN** the owner chooses "Completar después" on the adjustment step and reaches the review
- **THEN** the review lists "Actualización" as pending with a link, and "Crear contrato" is unavailable with the reason stated

#### Scenario: Pending step completed
- **WHEN** the owner follows the link, completes the adjustment and returns to the review
- **THEN** nothing is pending and "Crear contrato" is available

### Requirement: A draft may carry the signed PDF

The review SHALL offer attaching the contract's signed PDF, optionally. An attached file SHALL be stored with the draft as soon as it is attached and SHALL become the contract's document when the contract is created. When the flow could not become a draft, the file SHALL be kept on screen and attached to the contract once it is created. The flow SHALL say that the file is stored as is and is not read automatically. A rejected file SHALL be explained with the same messages as the contract PDF import, and the rest of the draft SHALL be unaffected. The owner SHALL be able to remove or replace the attached file.

#### Scenario: Attach and finish later
- **WHEN** the owner attaches `contrato.pdf` in the review and closes the flow
- **THEN** resuming the draft on another device shows `contrato.pdf` attached

#### Scenario: Contract created from a draft with its PDF
- **WHEN** the owner creates the contract from a draft that has a PDF
- **THEN** the new contract's detail shows that PDF as its document, and the draft no longer appears anywhere

#### Scenario: Protected PDF
- **WHEN** the attached file is an encrypted PDF
- **THEN** the review explains that the file cannot be used and the draft's other data is kept

### Requirement: Drafts can be resumed from Inicio, Contratos and "Nuevo contrato"

The owner's drafts SHALL appear in Inicio (as specified by `inicio`) and in a "Borradores" group at the top of Contratos. Each SHALL show its label and when it was last edited, with "Continuar" and "Descartar". The group SHALL NOT appear when there are no drafts. "Continuar" SHALL open the flow on the step where the draft was saved, with everything it held. "Nuevo contrato" SHALL, when drafts exist, first offer to continue one of them or start a new contract. When the owner has the maximum number of drafts, starting a new contract SHALL NOT be offered, and the screen SHALL say why.

#### Scenario: Resume on another device
- **WHEN** the owner saved a draft on the adjustment step on their laptop and taps "Continuar" in Inicio on their phone
- **THEN** the flow opens on the adjustment step with the property, tenant, rent and term already filled

#### Scenario: New contract with a draft pending
- **WHEN** the owner has one draft and opens "Nuevo contrato"
- **THEN** the flow first offers to continue "Lavalle 950 · Pérez" or start a new contract

#### Scenario: At the limit
- **WHEN** the owner has 3 drafts and opens "Nuevo contrato"
- **THEN** only continuing one of them is offered, with an explanation that 3 is the maximum and one must be finished or discarded

### Requirement: Discarding a draft is confirmed

"Descartar" SHALL ask for confirmation in an in-app dialog that names the draft and states that its data and attached PDF are deleted and cannot be recovered. Confirming SHALL delete the draft and remove it from every list. Cancelling SHALL leave it unchanged.

#### Scenario: Discard from Inicio
- **WHEN** the owner taps "Descartar" on a draft's notice and confirms
- **THEN** the draft disappears from Inicio and Contratos

#### Scenario: Change of mind
- **WHEN** the owner taps "Descartar" and then "Volver"
- **THEN** the draft is still listed

### Requirement: Drafts expire and say so in advance

A draft SHALL be deleted by the system 90 days after its last edit. From 15 days before that date, its notice in Inicio and Contratos SHALL state the date on which it will be discarded unless it is resumed. Any edit saved to the draft SHALL restart the period.

#### Scenario: Close to expiry
- **WHEN** a draft expires in 10 days
- **THEN** its notice says it will be discarded on that date if it is not resumed

#### Scenario: Far from expiry
- **WHEN** a draft was edited yesterday
- **THEN** its notice does not mention expiry

### Requirement: Creating the contract consumes the draft

Creating the contract from a resumed draft SHALL send the draft's identifier with the creation, so that the draft disappears and its PDF becomes the contract's document in the same operation. If the creation fails, the draft SHALL remain as it was. If the draft no longer exists when the contract is created (it expired or was discarded on another device), the flow SHALL create the contract without it and SHALL say that the attached PDF, if there was one, must be added from the contract's detail.

#### Scenario: Validation error on creation
- **WHEN** the backend rejects the creation of a resumed draft for an invalid due day
- **THEN** the flow goes to the rent step with the error, and the draft is still listed

#### Scenario: Draft discarded meanwhile
- **WHEN** the owner creates the contract while the draft was discarded on another device
- **THEN** the contract is created and the flow says that the PDF must be attached from the contract's detail

### Requirement: Concurrent edits are not lost silently

When a save finds that the draft was changed on another device since this flow last saved it, the flow SHALL NOT overwrite it silently. It SHALL stop saving automatically, say that the draft changed elsewhere, and offer to keep this version or to load the other one. Keeping this version SHALL overwrite the other and resume automatic saving. Loading the other one SHALL discard this session's unsaved changes.

#### Scenario: Edited on two devices
- **WHEN** the owner has the same draft open on phone and laptop, edits on the phone, and then edits on the laptop
- **THEN** the laptop stops saving, says the draft changed on another device, and offers both options
