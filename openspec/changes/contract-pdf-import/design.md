# Design

## Context

- **Prototype:** `src/components/dashboard/ContractFromPdf.tsx` on branch `prototipo/contrato-desde-pdf` has the four phases (`subir`, `leyendo`, `fallo`, `revisar`), the per-field review items, and a simulated reading that always returns the same contract. Its decisions (`docs/design/propuesta-contrato-desde-pdf.md`) stand, except R5: the backend now keeps the data of imports that end in a contract.
- **Backend API** (`propertly-backend` `contract-pdf-import`, `ai-usage-limits`):
  - `GET /contract-imports/quota` returns `{used, limit, available}`; the limit is 5 readings in total per owner.
  - `POST /contract-imports` takes one multipart file and answers `202 {id, status}`, or returns an earlier import for an identical file. Rejections come as `application/problem+json`.
  - `GET /contract-imports/{id}` returns the status (`QUEUED`, `PROCESSING`, `READY`, `FAILED`, `ABANDONED`, `COMPLETED`) and, when `READY`, the result:
    - `fields`, each with `value`, `status` (`LITERAL`/`INFERRED`/`MISSING`/`UNSUPPORTED`), `evidence` (`page`, `quote`, `verified`), `note` and `validation`;
    - `unsupported`;
    - `matches`.
  - `POST /contract-imports/{id}/retry`, `POST /contract-imports/{id}/complete`, `DELETE /contract-imports/{id}`, and `GET /contract-imports/{id}/document` (the PDF).
- **Existing client:** `src/lib/api.ts` already sends `X-Requested-With`, handles `FormData` (`apiPostForm`) and blobs (`apiGetBlob`), and maps problem types through `error-codes.ts`.

## Decisions

### D-1. The PDF is a shortcut into the wizard, not a separate wizard

The choice screen sits in front of the existing "Nuevo contrato" (prototype decision 1). The review produces the same data the manual wizard does. Any dead end (rejected file, failed reading, no readings left) offers "Cargarlo a mano", carrying over nothing that was not confirmed.

### D-2. The prototype's progress list, driven by real stages

The waiting screen keeps the prototype's design: a list whose items are ticked off one by one (the product owner likes it). Each tick follows a real backend `stage`, never a timer:

The backend reports the stage the job is in, and two of them run in parallel: the local OCR (`READING_PAGES`, with `pagesDone`/`pagesTotal`) and the model call (`FINDING_DATA`). It reports `FINDING_DATA` while both run, and `READING_PAGES` when only the OCR is left, so neither stage proves that the other has finished. Showing both as separate items made two of them look in progress at once, so the screen merges them into one step and the list has three, always in order:

| Item | Ticked when the job reaches | In progress while the stage is |
|---|---|---|
| Abriendo el archivo | `READING_PAGES`, `FINDING_DATA` or later | `OPENING` |
| Leyendo las páginas y buscando los datos (página N de M) | `CHECKING` (or later) | `READING_PAGES` or `FINDING_DATA` (the counter follows `pagesDone`/`pagesTotal`) |
| Revisando lo que encontramos | `READY` | `CHECKING` |

A job still in `QUEUED` has no stage, so nothing is in progress or ticked and the screen says it is waiting for its turn.

The current item shows the activity indicator, and items not reached yet are dimmed, as in the prototype. The large indicator at the top is an arc whose stroke grows and shrinks while it turns, not the fixed quarter ring of the small inline spinner. The front polls every 2 s.

- **After 90 s still processing:** "Está tardando más de lo normal", with "Seguir esperando" and "Cargarlo a mano".
- **"Cancelar":** calls `DELETE` (the backend then discards the file) and returns to the upload screen.

Status changes are announced through an `aria-live` region.

### D-3. Viewing the source: cited page plus quote

The evidence is a page number and a quote, with offsets into the page text. It has no coordinates on the page image, and the contracts are scanned, so the prototype's highlighted fragment cannot be drawn precisely. "Ver en el contrato" therefore:

- renders the cited page with `pdfjs-dist` on a canvas, loaded from the backend as a blob and imported only when the review opens. The version is pinned (5.7.284), which no longer evaluates code at run time and has no `isEvalSupported` option to turn off; upgrading must keep it that way;
- shows the quote in a highlighted box next to the page;
- on narrow screens (< 900 px, where the document does not fit beside the data), shows the quote under the value and a "Ver página N" link.

The PDF viewer was chosen over the browser's built-in viewer (`#page=N`) because the built-in one cannot be controlled consistently across browsers and gives no way to add highlights later. Highlighting the exact region on the page would need word boxes from the backend's OCR; that is listed as a follow-up.

### D-4. Mapping backend states to the review

| Backend | Review state (icon + word) | Resolved by |
|---|---|---|
| `LITERAL`, verified evidence | none (shows "Página N") | — (counts as `UNTOUCHED` unless the owner acts) |
| `INFERRED` | "Revisar", with the note ("El contrato dice… / Se dedujo…") and validation reasons | "Está bien así" (`CONFIRMED`) or a correction (`CORRECTED`) |
| `MISSING`, required | "Falta completar" | filling it in (`FILLED`) |
| `MISSING`, optional | shown in "También figura en el contrato" only if the owner adds it | — |
| `UNSUPPORTED` | "No se puede cargar así", with the quote and an explanation | a choice the review offers (for example, pick one of two tenants), or "Cargarlo a mano" |

Any field the owner edits becomes `CORRECTED`, or `FILLED` if it was empty. The counter in the footer counts unresolved "Revisar", "Falta completar" and blocking "No se puede cargar así" items.

### D-4b. What the review offers for each unsupported clause

An unsupported clause is something the lease says that the app cannot store as written. It is never forced into a field silently. What the review offers depends on the reason (product owner, 2026-10-10):

| Reason | Review offers |
|---|---|
| Two or more tenants | Pick which one is the contract's tenant, or "Cargarlo a mano" |
| Stepped rent (different amounts per year) | Explanation and "Cargarlo a mano" (blocking) |
| Index other than ICL or IPC | Explanation and "Cargarlo a mano" (blocking) |
| Due day after 28 | "Usar el día 28", stating the difference, or "Cargarlo a mano" |
| Late fee tied to a bank rate, or combined | Create the contract without a late fee, with a note to add it later from the contract detail |

"Blocking" means "Crear contrato" stays disabled. The other reasons count as resolved once the owner picks an option.

### D-5. Existing property and tenant

When `matches.property` or `matches.tenant` is present, the item shows "Ya la tiene cargada: <dirección>" or "Ya lo tiene cargado: <nombre>", using the existing one by default, with "Crear uno nuevo" as the alternative (prototype decision 6). Without a match, a new one is created with the read values.

### D-6. Creating and completing

"Crear contrato" sends the reviewed values to the `contract-onboarding-flow` endpoint, using existing property and tenant ids where chosen. It includes the answer to the elapsed-installments question (`in-progress-contract-onboarding`) when the start date is in the past. Then it calls `complete` with the contract id, the final values and each field's action.

If `complete` fails after the contract exists, the front retries once. If it still fails, it shows the contract as created, with a note that the PDF could not be attached and a link to attach it from the contract detail. The contract is never created twice.

### D-7. Leaving and resuming

- **Leaving the review:** asks for confirmation in an in-app dialog, never a browser `confirm`: "Si sale ahora, se descarta la lectura y no guardamos el archivo". Confirming calls `DELETE`.
- **Closing the tab:** the backend abandons the import after 30 days.
- **Resuming:** uploading the same file again returns the same import (the backend deduplicates it) without using a reading, as long as it was not abandoned. A list of unfinished readings is a follow-up, since the backend has no list route.

### D-8. Safety in the client

- Extracted values are untrusted text from a file. They are rendered as React text only, never as HTML.
- Pre-checks (extension or type `application/pdf`, at most 20 MB) only give faster feedback; the backend validates for real.
- Following prototype decision 9, the UI says what is done ("Lo leemos") and avoids AI aesthetics.

## Risks / Trade-offs

- **The review cannot point at the exact place on a scanned page,** only the page and the quote. This is acceptable for the MVP; region highlighting is a follow-up that depends on the backend.
- **`pdfjs-dist` adds weight.** It is loaded only on the review screen.
- **Dependencies on three backend changes** (`contract-onboarding-flow`, `in-progress-contract-onboarding`, plus import itself) set the release order.

## Open Questions

- Whether the owner should see their remaining readings permanently (for example, in Configuración) or only in the choice screen. Default: only in the choice screen.
