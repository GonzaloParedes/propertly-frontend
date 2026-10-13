# Spec Delta

## Purpose

Let an owner create a contract from its signed PDF, checking every value against the document before anything is saved, with manual entry always available as a way out.

## ADDED Requirements

### Requirement: The owner chooses how to load the contract

"Nuevo contrato" SHALL first offer "Subir el contrato firmado" and "Cargarlo a mano". "Cargarlo a mano" SHALL open the existing wizard unchanged. The upload option SHALL show the readings left, from `GET /contract-imports/quota`. When `available` is false, the option SHALL say why (no readings left, or reading unavailable right now) and SHALL point to manual entry.

#### Scenario: Readings left
- **WHEN** the quota is `used` 2, `limit` 5, `available` true
- **THEN** the upload option shows that 3 readings are left

#### Scenario: No readings left
- **WHEN** the quota is `used` 5, `limit` 5
- **THEN** the upload option is disabled, says the readings are used up, and offers "Cargarlo a mano"

### Requirement: Uploading accepts one PDF and explains every rejection

The upload screen SHALL accept a single PDF by drag and drop or file picker, and show its name and size, with "Cambiar". Before sending, it SHALL reject files that are not PDF or exceed 20 MB. Every backend rejection SHALL be shown in plain words with "Probar con otro archivo" and "Cargarlo a mano", and SHALL NOT be shown as a technical error. The rejections are: not a PDF, too large, too many pages, password-protected, active content, no readings left, and reading unavailable.

#### Scenario: Password-protected file
- **WHEN** the backend rejects the file as encrypted
- **THEN** the screen says the PDF has a password and must be saved without one, and offers both ways out

#### Scenario: Wrong type before sending
- **WHEN** the owner picks a `.jpg`
- **THEN** nothing is sent and the screen asks for the contract as a PDF

### Requirement: The waiting screen reflects the real status

After upload, the front SHALL poll the import until it is `READY` or `FAILED`. While waiting, it SHALL show a progress list of three steps in order: opening the file, reading the pages and finding the contract data (with a page counter), and checking what was found. The backend runs the page reading and the data extraction in parallel, so they are one step. It SHALL tick each step only when the backend reports a later stage, never by time, and SHALL never show two steps in progress at once, and SHALL announce changes to assistive technology. "Cancelar" SHALL discard the import and return to upload. After 90 seconds it SHALL offer "Seguir esperando" and "Cargarlo a mano". A `FAILED` import SHALL offer "Probar con otro archivo", "Cargarlo a mano", and "Intentar de nuevo" (retry).

#### Scenario: Reading pages
- **WHEN** the backend reports `READING_PAGES` with `pagesDone` 3 and `pagesTotal` 6
- **THEN** "Abriendo el archivo" is ticked, "Leyendo las páginas y buscando los datos" is the only step in progress and shows page 3 of 6, and "Revisando lo que encontramos" is not ticked

#### Scenario: Cancel
- **WHEN** the owner cancels while the import is processing
- **THEN** the import is discarded through `DELETE` and the upload screen is shown

#### Scenario: Uncertain failure
- **WHEN** the import ends `FAILED` with reason `UNCERTAIN`
- **THEN** the screen offers the three ways out, and "Intentar de nuevo" calls the retry route

### Requirement: The review shows every value with its state and source

The review SHALL show the document beside the data on wide screens, and the data alone on screens narrower than 900 px. Every value SHALL be read-only until "Corregir". Values SHALL be shown with their state, as icon plus word, mapped as in `design.md` D-4:

- as written, with its page;
- "Revisar", with what the contract says and what was deduced;
- "Falta completar";
- "No se puede cargar así", with the quote.

An unsupported clause SHALL never be loaded silently into a field. The review SHALL offer, by reason:

- two or more tenants: choosing one, or manual entry;
- stepped rent or an index other than ICL/IPC: manual entry only, and it blocks creation;
- due day after 28: using day 28 with the difference stated, or manual entry;
- a bank-rate or combined late fee: creating without a late fee, with a note to add it later.

"Ver en el contrato" SHALL show the cited page and the quote. On narrow screens the quote SHALL appear under the value. Extracted text SHALL be rendered as plain text.

#### Scenario: Inferred value
- **WHEN** the due day is `INFERRED` with the note "El contrato dice «del 1 al 10 de cada mes»"
- **THEN** the item shows "Revisar", the note, "Está bien así" and "Corregir"

#### Scenario: Seeing the source
- **WHEN** the owner chooses "Ver en el contrato" on the rent, whose evidence is page 2
- **THEN** page 2 is shown with the quoted clause beside it

#### Scenario: Due day 30
- **WHEN** the lease's due day is 30
- **THEN** the review offers "Usar el día 28", stating that the contract says 30, or "Cargarlo a mano"

#### Scenario: Stepped rent
- **WHEN** the lease sets a different rent for each year
- **THEN** the review explains it cannot be loaded as written, "Crear contrato" stays disabled, and "Cargarlo a mano" is offered

#### Scenario: Two tenants
- **WHEN** the result lists `MULTIPLE_TENANTS` as unsupported
- **THEN** the review shows "No se puede cargar así" with both names, and offers choosing one tenant or loading the contract by hand

### Requirement: Existing property and tenant are reused by default

When the result includes a property or tenant match, the review SHALL offer the existing record by default, with "Crear uno nuevo" as the alternative. Without a match, the review SHALL create a new record from the reviewed values.

#### Scenario: Tenant already loaded
- **WHEN** `matches.tenant` points to an existing tenant
- **THEN** the review shows "Ya lo tiene cargado" with that tenant's name, and creating the contract uses that tenant

### Requirement: Creating is enabled only when nothing is left to resolve

"Crear contrato" SHALL be disabled while any "Revisar", "Falta completar" or blocking "No se puede cargar así" item remains, and the footer SHALL say how many remain. When the start date is in the past, the review SHALL require the answer to "¿Hasta qué mes le pagaron?", as specified by `in-progress-contract-onboarding`, before creating. Creating SHALL create the contract with the reviewed values, then complete the import with the contract id, the final values, and each field's action (`UNTOUCHED`, `CONFIRMED`, `CORRECTED`, `FILLED`). If completing fails after the contract exists, the front SHALL retry once. Then it SHALL show the contract as created, with a link to attach the PDF from its detail, and SHALL NOT create the contract again.

#### Scenario: Two items left
- **WHEN** one value is "Revisar" and one is "Falta completar"
- **THEN** "Crear contrato" is disabled and the footer says 2 items remain

#### Scenario: Field actions
- **WHEN** the owner confirms the due day, corrects the deposit, fills the tenant's email and leaves the rent untouched
- **THEN** the completion sends `CONFIRMED`, `CORRECTED`, `FILLED` and `UNTOUCHED` for them, respectively

### Requirement: Leaving discards the reading after confirmation

Leaving the review without creating SHALL ask for confirmation in an in-app dialog. The dialog SHALL state that the reading is discarded and the file is not kept. Confirming SHALL discard the import through `DELETE`.

#### Scenario: Leave
- **WHEN** the owner closes the review and confirms
- **THEN** the import is discarded and the workspace is shown
