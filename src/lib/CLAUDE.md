# CLAUDE.md — src/lib

`backend-client.ts` (`AlquiaBackendClient`) and `backend-types.ts` must stay in sync with the
backend's Swagger UI: `http://localhost:8080/swagger-ui.html` (dev). Before adding, removing, or
changing an endpoint method or its request/response types, check that URL against the current
backend spec — don't rely on memory or prior conversation state, the backend evolves
independently of this repo.

`api.ts` also exports `apiPostForm`/`apiGetBlob` for the non-JSON endpoint pairs — a `FormData`
body skips the JSON `Content-Type` header, and a `Blob` response skips JSON parsing. Two pairs
exist so far: `contracts.attachDocument`/`getDocument`/`removeDocument` (backed by
`/contracts/{id}/document`) and `payments.attachReceipt`/`getReceipt`/`removeReceipt` (backed by
`/payments/{id}/receipt`). `ContractResponse.documentFileName`/`documentContentType`/
`documentSizeBytes` and `PaymentResponse.receiptFileName`/`receiptContentType`/`receiptSizeBytes`
are optional and absent when no file/receipt is attached. Attaching a receipt to a PENDING or DUE
payment also flips its `status` to `PAID` as part of that same backend call — the frontend never
issues a separate status update for this.
