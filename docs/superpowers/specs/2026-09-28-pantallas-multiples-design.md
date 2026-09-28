# Pantallas múltiples — design

Issue #3, item 5: *"crear varias pantallas para todas las categorías y diferentes olas y poder dividir y mostrar todas al mismo tiempo"*.

- **Status:** design approved with the owner in conversation on 2026-09-28 (all three parts below). Spec not yet reviewed by the owner. Nothing built.
- **Next step:** owner reviews this file, then an implementation plan is written (superpowers `writing-plans`) and built test-first.
- **Mockups** (approved versions, open in a browser): [`2026-09-28-pantallas-multiples/`](2026-09-28-pantallas-multiples/)
  - `panel-a2.html` — panel design; **A2** is the chosen option (A1 is shown next to it).
  - `velocidad-scroll.html` — scroll demo; **Medium** is the chosen speed.
  - `selector-y-layouts.html` — the panel picker and the 1–4 panel layouts.

## Goal

The public screen (`/pantalla/:id`) can show several categories at once, live, on one or more TVs. Each TV shows up to four panels; each panel is one category (or one ola of a category) with its podium always visible and the rest of the standings scrolling slowly.

## Decisions taken with the owner

| Topic | Decision |
|---|---|
| Size of a race | 5–8 categories typically. |
| Panels per screen | Up to **4** (2 × 2). More categories → more windows / TVs. |
| What a panel shows | **Top 3 always visible**; places 4 and below scroll (mix of "full standings" and "podium" options). |
| Distances | Each category belongs to one distance (e.g. "Sprint M 30-34" and "Olímpico M 30-34" are separate categories), so panels need no distance split and the existing category places are correct. |
| Where the choice lives | **In the URL** (approach A). No database change; each TV window keeps its own selection. |
| Panel look | **A2**: a line under every competitor plus alternating bands, a thicker line between podium and the rest. |
| Scroll speed | **Medium**: 1 row every 2 s, 3 s pause at start and end, fade back to the top, loop. |
| Title strip | Event name · ● En vivo · clock (no "Pantalla N de M": a hand-picked set has no number). |

## Behaviour

### Choosing panels (part 1)

- With no selection, Pantalla shows today's general table, unchanged.
- The control bar gets a **"▦ Paneles (n/4)"** button that opens a picker:
  - A checklist of every group of the event (see *Groups* below). At most 4 can be ticked; the other boxes disable at 4. A counter reads "n de 4 elegidos".
  - **Pantallas listas**: links "Pantalla 1 de N", "Pantalla 2 de N"… that split all groups in configured order, 4 per screen (8 groups → 2 screens; 5 → 4 + 1). Each opens in a new window (`target="_blank"`), one per TV. Under each link, the names of its groups.
  - **Tabla general**: clears the selection.
- Ticking and unticking rewrites the URL: `/pantalla/:id?grupos=<clave>,<clave>,…` (see *URL format*).
- Layout by number of panels: **1** full screen · **2** side by side · **3** three columns · **4** 2 × 2.
- In panel mode the control bar hides after **3 s** without mouse movement and comes back on mouse move. What remains is the thin title strip and the panels. Full screen stays F11, as today.

### Groups

- One group per category. A category with **2 or more olas** gives one group per ola, named "Categoría · Ola" (e.g. "Élite M · Ola 1"). A category with 0 or 1 ola is a single group.
- Order: categories in the order they are configured in the event; olas in their configured order.
- Finishers of a multi-ola category who have **no ola assigned** appear in no panel (they remain in Resultados). The picker is built from the configuration only.

### Panel content (part 2)

- **Rows:** only finishers — status Activo with a finish time. DNS / DNF / DSQ and unregistered dorsales are left out (they stay visible in Resultados).
- **Place:** the category place `lugarCategoria` from `getResultados()` — the same number Resultados and the PDF show (per ola when a category is split). Rows are ordered by it.
- **Header:** group name and "N llegadas" (N = finishers in the panel).
- **Podium:** places 1–3 in larger type with 🥇🥈🥉. With fewer than 3 finishers, only those rows, then the thicker line.
- **Places 4+:** a line under every row and alternating bands (A2). Text size scales with the panel size (1 panel largest, 4 smallest).
- **Empty group:** "Esperando llegadas…".

### Scrolling (part 2)

- If places 4+ fit in the panel, they do not move.
- Otherwise a loop: **pause 3 s** at the top → scroll at **1 row per 2 s** → **pause 3 s** at the end → **fade out 0.5 s**, jump to the top, **fade in 0.5 s** → repeat.
- **New arrivals do not restart the loop.** The list grows and the scroll keeps going from where it is, further down, before resetting; growth during the end pause resumes scrolling. If the list shrinks (e.g. a finisher is marked DNF), the offset is clamped to the new end. (With CSS keyframes a changed row count would restart the animation; at a busy finish the list would keep jumping to the top and the lower places would never show.)
- Every panel scrolls independently.

### Data (part 2)

- Pantalla's existing loader stays: first load, a 5 s poll, and instant updates from other tabs over `BroadcastChannel` (`cronometraje-sync`). Panels are computed from the loaded `evento` + `filas`.
- **Importar JSON** keeps working: panels are built from the imported `evento` and `filas` too (route `/pantalla` without id accepts the same `grupos` parameter).

## URL format

`/pantalla/:id?grupos=<clave>,<clave>`

- `clave` is `categoriaId` for a whole category, or `categoriaId:olaId` for one ola of a multi-ola category. Ids are the stored uuids, so renaming a category doesn't break a TV's URL.
- On read: unknown claves are dropped, duplicates removed, at most the first 4 kept.

## Architecture (part 3)

**`src/utils/paneles.js`** — pure functions, unit-tested without a DOM:

| Function | Contract |
|---|---|
| `gruposDelEvento(evento)` | `[{ clave, nombre, categoriaId, olaId }]` in configured order (`olaId` null for whole-category groups). |
| `filasDelGrupo(filas, grupo)` | Finisher rows (Activo, with `tiempoNeto`) of that group, ordered by `lugarCategoria`. |
| `leerGrupos(searchParams, grupos)` | Valid claves from `?grupos=`, deduplicated, max 4. |
| `urlGrupos(claves)` | Query string for a selection (`''` when empty). |
| `repartirEnPantallas(grupos, porPantalla = 4)` | Chunks of groups for the ready links. |
| `avanzarDesplazamiento(estado, ms, medidas)` | Scroll state machine: `{ fase: 'inicio' \| 'avanzando' \| 'final' \| 'fundido', desplazamiento, tiempoEnFase }` advanced by `ms`, given `{ altoFila, altoVisible, altoLista }` in px. Speed = `altoFila` per 2000 ms. If `altoLista <= altoVisible` it stays at 0. A larger `altoLista` during `avanzando` or `final` extends the run instead of resetting; a smaller one clamps `desplazamiento`. |

**Components**

- `src/components/pantalla/PanelGrupo.jsx` — header, podium, list. Drives `avanzarDesplazamiento` from `requestAnimationFrame`, measuring row / list / window heights from the DOM; applies `transform: translateY(-desplazamiento)` and the fade opacity. Cleans up the frame loop on unmount.
- `src/components/pantalla/SelectorPaneles.jsx` — the "▦ Paneles" button and dropdown: checklist capped at 4, counter, ready links, "Tabla general".
- `src/pages/Pantalla.jsx` — reads `grupos` with `useSearchParams`. With groups: title strip, auto-hiding control bar, grid of `PanelGrupo` by count. Without: the current table. Keep the file under 500 lines by putting the panel pieces in the components above.

No database schema change; nothing new is stored.

## Testing (part 3)

Tests first, as in the rest of the repo (Vitest + Testing Library + fake-indexeddb).

- **`tests/utils/paneles.test.js`**
  - groups for categories with 0, 1 and 2+ olas, and their order;
  - `filasDelGrupo` excludes DNS/DNF/DSQ, rows without time, unregistered dorsales, and multi-ola athletes without ola;
  - `leerGrupos` / `urlGrupos`: round trip, unknown claves dropped, duplicates removed, cap at 4;
  - `repartirEnPantallas`: 8 → [4, 4], 5 → [4, 1], 0 → [];
  - `avanzarDesplazamiento`: stays put when the list fits; 3 s pause; 1 row per 2 s; end pause; fade and reset to 0; growth during `avanzando` / `final` extends instead of resetting; shrinking clamps the offset.
- **`tests/pages/Pantalla.test.jsx`** (the file exists with characterization tests)
  - `?grupos=` renders the chosen panels with podium and rows, and "Esperando llegadas…" for an empty group;
  - ticking in the picker updates the URL and disables further boxes at 4;
  - ready links point to the expected URLs;
  - a live update (`BroadcastChannel`) adds the new finisher to its panel;
  - no `grupos` → today's table (existing tests keep passing).
- **Real browser** (Playwright): screenshots of 1–4 panel layouts, and two samples a few seconds apart proving a long list scrolls and later resets.

## Out of scope

- Saving screen layouts in the database (approach B) or fully automatic splitting without a picker (approach C).
- Highlighting newly arrived rows or a "última llegada" line (option (c) was only partly chosen: podium yes, latest arrivals no).
- A "General" panel inside the grid (the no-selection table remains the general view).
- Per-distance panels (categories are per distance by convention).

## Handoff for the next session

- **Issue #3 state**
  - PR #4 `fix/issue-3-edad-csv` → `main`: items 3 and 4 (ages, CSV import/export).
  - PR #5 `feat/issue-3-asistente-botones`, stacked on #4: items 1 and 2 plus the owner's three extras, the wave-timing fix (each finisher timed from their own ola) and the lint cleanup (`react-hooks/set-state-in-effect` is an error again; lint must stay at 0 problems).
  - This spec: branch `feat/issue-3-pantallas`, stacked on #5. No PR yet.
- **Merge order:** #4, then #5 (it retargets to `main` when #4's branch is deleted; CI `verify` only runs for PRs into `main`, so re-run it then), then this piece, whose PR should say "Closes #3".
- **Next steps:** owner reviews this spec → implementation plan → build test-first on `feat/issue-3-pantallas`.
- **Conventions in this repo:** Spanish UI strings; `npm run lint && npm run test:run && npm run build` must pass before committing.
