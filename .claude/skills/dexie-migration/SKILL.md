---
name: dexie-migration
description: Safely add or change a Dexie schema version in src/db.js. Use whenever a table, index, or stored field shape changes — even a "small" tweak. Race-day data loss is unrecoverable, so this skill is rigid.
---

# dexie-migration

Add a new Dexie schema version in `src/db.js` without dropping or corrupting existing race data.

## When to use

Invoke whenever any of these are true:

- Adding a new table to `db.version(N).stores({...})`
- Adding or removing an index (anything in the comma-separated string)
- Renaming a field that already lives on disk
- Changing the shape of a stored object (default value, type, enum)
- Adding a compound index like `[eventoId+dorsal]`

If you are only adding a brand-new field with no default and no index, you can skip the migration — Dexie tolerates additive fields. Everything else needs a version bump.

## The rule

**Never edit `db.version(N)` once it has shipped.** Add `db.version(N+1)` below it with a new `.stores({...})` and an `.upgrade(tx => ...)`. Keep all prior versions in the file forever — Dexie replays them for users still on an older schema.

## Checklist

Create a TodoWrite item per step. Do not skip any.

1. **Read current `src/db.js`** end-to-end. Note the highest existing version number and every prior `.upgrade()` body.
2. **Add the new version block** immediately after the highest version. Format:
   ```js
   db.version(N+1).stores({
     // ALL tables, even unchanged ones — Dexie diffs from the previous version
   }).upgrade(async tx => {
     // backfill / mutate existing rows here
   })
   ```
3. **In `.stores()`, include every table**, not just the changed one. A table omitted from the new version is dropped.
4. **For each added index**, ensure existing rows have the indexed field populated. Use `.upgrade()` with `tx.<table>.toCollection().modify(row => { ... })` to backfill.
5. **For each renamed field**, write both names during a transitional version: copy old → new in `.upgrade()`, leave reads tolerant of either, plan a follow-up version to drop the old key.
6. **Update the schema comment block** at the bottom of `src/db.js` so the documented object shape matches reality.
7. **Write a migration test** in `tests/db.migration.test.js`. Use `fake-indexeddb` (already in devDeps). Pattern:
   ```js
   import 'fake-indexeddb/auto'
   import Dexie from 'dexie'

   test('vN → vN+1 backfills <field>', async () => {
     // 1. open DB at the OLD version, seed rows
     const oldDb = new Dexie('cronometraje-test')
     oldDb.version(N).stores({ /* old schema */ })
     await oldDb.open()
     await oldDb.<table>.add({ /* row missing the new field */ })
     oldDb.close()

     // 2. reopen with the NEW schema (import from src/db.js or redefine)
     // 3. assert the row now has the backfilled value
   })
   ```
8. **Run the test**: `npm run test:run -- tests/db.migration.test.js`. Do not proceed until it passes.
9. **Manual smoke**: `npm run dev`, open the app in a browser that already has data (do NOT clear IndexedDB). Verify: app loads, existing event opens, athletes list renders, no console errors from Dexie.
10. **Commit** `src/db.js` + the migration test together. Never split them across commits.

## Failure modes to avoid

| Mistake | Consequence |
|---|---|
| Editing `db.version(2)` instead of adding `db.version(3)` | Users on v2 schema get a `VersionError` and the app refuses to open. |
| Omitting an unchanged table from the new `.stores({...})` | Dexie drops that table. All data in it gone. |
| Adding an index without backfilling the field | Queries silently return empty results for old rows. |
| Renaming a field without a copy step | Old rows become unreadable through the new field name. |
| Mutating row shape inside React effects instead of `.upgrade()` | Migration only runs for users who hit that code path — partial corruption. |
| Skipping the manual smoke with pre-existing data | Tests use empty DBs; real upgrade bugs only surface against real seeded data. |

## Reference — current schema (as of v2)

```
eventos:  ++id, nombre, fecha, lugar, tipo, estado
atletas:  ++id, eventoId, dorsal, nombre, [eventoId+dorsal]
tiempos:  ++id, eventoId, atletaId, dorsal, segmento
```

Documented object shapes live in the comment block at the bottom of `src/db.js`. Keep them in sync.
