# CLAUDE.md — src/lib

`backend-client.ts` (`AlquiaBackendClient`) and `backend-types.ts` must stay in sync with the
backend's Swagger UI: `http://localhost:8080/swagger-ui.html` (dev). Before adding, removing, or
changing an endpoint method or its request/response types, check that URL against the current
backend spec — don't rely on memory or prior conversation state, the backend evolves
independently of this repo.

`error-codes.ts` mirrors the backend's error catalog. The backend sends errors as RFC 9457
Problem Details (`application/problem+json`) with a stable `type` URN (`urn:alquia:error:<slug>`)
per condition; its source of truth is `exception/ApiErrorType.java` in `alquia-backend`. The
frontend decides what to show by `type` (never by the English message text), via `copyDeError`.
There is no cross-repo codegen yet (ALQ-32), so `ERROR`/`COPY` here are kept in sync by hand —
when the backend adds or renames a `type` a screen needs to distinguish, update this module. An
unknown or absent `type` falls back to Spanish copy; the raw `detail`/`title` (English) is never
shown. `ApiError` carries `type` and `fieldErrors` (the per-field `errors` extension) alongside
`status`/`message`.

`api.ts` also exports `apiPostForm`/`apiGetBlob` for the non-JSON endpoint pairs — a `FormData`
body skips the JSON `Content-Type` header, and a `Blob` response skips JSON parsing. Two pairs
exist so far: `contracts.attachDocument`/`getDocument`/`removeDocument` (backed by
`/contracts/{id}/document`) and `payments.attachReceipt`/`getReceipt`/`removeReceipt` (backed by
`/payments/{id}/receipt`). `ContractResponse.documentFileName`/`documentContentType`/
`documentSizeBytes` and `PaymentResponse.receiptFileName`/`receiptContentType`/`receiptSizeBytes`
are optional and absent when no file/receipt is attached. Attaching a receipt to a PENDING or DUE
payment also flips its `status` to `PAID` as part of that same backend call — the frontend never
issues a separate status update for this.
