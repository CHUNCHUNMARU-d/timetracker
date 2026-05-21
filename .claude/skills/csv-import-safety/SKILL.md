---
name: csv-import-safety
description: Use when editing src/components/ImportarCSV.jsx, any papaparse + Dexie write path, or adding new bulk-import flows. Prevents silent dorsal collisions and partial writes on race day.
---

# csv-import-safety

Bulk athlete imports happen once per event and corrupt silently if rules are skipped. Apply every rule below — no shortcuts.

## Invariants

1. **Always dedup by `[eventoId+dorsal]`** before writing. Check DB *and* in-CSV duplicates. Existing skill in repo: `dexie-migration` enforces that the compound index exists.
2. **Trim every string field** (`dorsal`, `nombre`, `apellido`, `email`, `telefono`). Whitespace is the #1 source of false-uniqueness misses.
3. **Cast `añoNacimiento` via `Number(...)` with `|| 0` fallback** — CSV always yields strings; raw strings break later sort/filter.
4. **Default `status: 'activo'`** on every imported row. The schema-v2 upgrade also backfills this, but writing it explicitly avoids reliance on migration.
5. **Default `distanciaId`** to the user-selected distancia (do not write `''`). Wire a `<select>` above the dropzone, gated as required when `evento.distancias.length > 0`.
6. **Use `db.atletas.bulkAdd(atletas)` inside a single try/catch** — partial writes corrupt rankings. On failure: surface a Spanish error to the user, keep the preview open, do not call `onImportado()`.
7. **Filter `__duplicado` rows out before write** — never persist sentinel fields to Dexie.
8. **Papaparse `header: true, skipEmptyLines: true`** — empty rows blow up downstream consumers.
9. **Surface, never swallow.** `Papa.parse({ error })`, `db.atletas.where(...)` reads, and `bulkAdd` must each set a Spanish `setError(...)` string. Silent paths = race-day disasters.
10. **No `confirm()` after import.** Trust the preview UI. Adding a prompt mid-flow blocks tablets in airplane mode.

## Required preview UI

- Spanish strings only. Header `Vista previa`, action `Importar N atleta(s)`.
- Distinguish three duplicate kinds visually: `'db'` (⊘ existed before), `'csv'` (⇆ repeated in file), `'sin-dorsal'` (✗ blank).
- Show category mapping selects only when CSV has a `categoria` column (`tieneCat`).
- Disable the Importar button when `numImportables === 0` OR `distancias.length > 0 && !distanciaId`.

## Required column set

`dorsal, nombre, apellido, genero, año_nacimiento, email, telefono` (+ optional `categoria`, `ola`). Spanish keys are part of the public spec — do not rename.

## Tests that must pass

`tests/components/ImportarCSV.test.jsx`:
- empty CSV → Spanish error
- duplicate dorsal in DB → flagged + skipped
- duplicate dorsal within CSV → flagged + skipped
- happy path → `db.atletas.bulkAdd` called once, `onImportado()` fires

## Anti-patterns (block on review)

- `await db.atletas.add(...)` in a `for` loop — use `bulkAdd`.
- Writing rows individually after a partial failure recovery — drop the batch, surface the error.
- Mocking `db.js` in tests — use `fake-indexeddb` against the real schema (already in `tests/setup.js`).
- Validating dorsal format (length, prefix). Race orgs use any format — do not enforce a pattern.
