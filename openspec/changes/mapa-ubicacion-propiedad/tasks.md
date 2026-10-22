# Tasks

## 1. Types and shared geo

- [x] 1.1 Make `latitude`/`longitude` required in `PropertyRequest` and `PropertyResponse`
  (`src/lib/backend-types.ts`) and update the coordinate comment; add `src/lib/geo.ts` with
  `CENTRO_DE_ARGENTINA` and the map zoom levels.

## 2. Interactive map component

- [x] 2.1 Add `PropertyLocationMapCanvas` (interactive Leaflet: draggable pin + tap-to-place,
  `AlquiaVectorLayer` basemap, `L.divIcon` pin, Case A/B centering) and the `PropertyLocationMap`
  wrapper (`next/dynamic({ ssr: false })`, instruction copy + coordinate readout).
- [x] 2.2 Add the `.property-map*` styles in `OwnerWorkspace.css`.

## 3. Create flow (CreationWizard)

- [x] 3.1 Render the location map in the property step; block the step
  (`propiedadBloqueada`) until coordinates are present.
- [x] 3.2 Make `armarPropiedad` require coordinates (throw if missing; no silent default).

## 4. Edit flow (OwnerWorkspace)

- [x] 4.1 Render the location map in `PropertyEditDialog`; require coordinates in `isPropertyValid`.

## 5. Tests and gate

- [x] 5.1 Add `property-location-map.test.tsx` (Case A verify, Case B require, tap-to-place and
  drag report coordinates); extend the shared test mocks (`useMapEvents`, `setView`, clickable map).
- [x] 5.2 Run `npm test` and `openspec validate mapa-ubicacion-propiedad --strict`. No new UI
  pattern needed a `docs/design/sistema-ui.md` entry (the map reuses the `.rent-map` box).

## Notes

- The contract-from-PDF prototype (`importacion-pdf.ts`, no map yet) falls back to the country
  center so its imported property still carries coordinates; correct it later by editing. Flagged
  for review.
- Pre-existing suite failures unrelated to this change: `owner-workspace-inicio` "hace 3 días"
  (time-of-day flaky in the `hace()`/test helper, fails ~00:00–03:00 UTC) and the
  `prototipo-inquilino` `scrollIntoView` jsdom limitation.
