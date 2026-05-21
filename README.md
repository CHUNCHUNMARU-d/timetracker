# Cronometraje · Race Timing PWA

Offline-first race-timing application for triathlons, duathlons, and running events.
Built for race-day operators: no cloud dependency, works on a phone with no signal,
bib registration in one tap, results published to a read-only second screen.

> **Aesthetic:** Stadium Scoreboard — dark, monospace digits, neon phase accents.
> **Tagline:** Race-day operations should not require Wi-Fi.

---

## Features

- **Offline-first.** All state in IndexedDB (Dexie). Service worker pre-caches the
  app shell and every font subset — the PWA installs on race day and never reaches
  the network again.
- **Three explicit phases per event** (`Preparación → Activa → Terminada`) with
  workflow gates that block common race-day mistakes:
  - Can't start the race without ≥1 atleta and ≥1 categoría.
  - Config (categorías, distancias, CSV import) is locked once the race is active.
  - Terminada is fully read-only — no edits, no rogue bib registrations.
- **True Stop semantics.** Stop = freeze the clock, lock the bib input, present a
  post-race panel with explicit next actions. No accidental nav to results.
- **Read-only Pantalla (second screen).** Opens in a new browser tab at
  `/pantalla/:id`. BroadcastChannel pushes updates instantly between tabs; falls
  back to 5-second polling. Ideal for the audience-facing display while the
  operator stays on Timing.
- **CSV import with collision detection** (dorsal duplicates flagged against both
  the existing DB and within the CSV itself).
- **PDF + JSON export** of results per category, filtered, or full.
- **WhatsApp share** of individual results.

---

## Quick start

```bash
npm install
npm run dev          # vite dev server (default http://localhost:5173)
npm test             # vitest watch
npm run test:run     # one-shot CI mode
npm run build        # production build with PWA precache
npm run preview      # serve the build locally
npm run lint
```

---

## Project layout

```
.
├── src/
│   ├── components/
│   │   ├── ui/                ← Stadium Scoreboard primitives
│   │   │   ├── RaceClock.jsx
│   │   │   ├── PhaseStrip.jsx
│   │   │   ├── PhaseBadge.jsx
│   │   │   ├── PhaseConfirmModal.jsx
│   │   │   ├── NeonButton.jsx
│   │   │   ├── StopGate.jsx
│   │   │   └── BibTally.jsx
│   │   ├── ImportarCSV.jsx
│   │   ├── ModalAtleta.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── PWAUpdatePrompt.jsx
│   │   └── ErrorBoundary.jsx
│   ├── pages/                 ← Inicio, NuevoEvento, DetalleEvento, Timing, Resultados, Pantalla
│   ├── utils/                 ← estado, tiempo, pdf, sync, share helpers
│   ├── styles/tokens.css      ← design-token CSS variables
│   ├── db.js                  ← Dexie schema (v1, v2, v3) + getResultados
│   ├── App.jsx                ← routing
│   ├── main.jsx               ← bootstrap + @fontsource imports
│   └── index.css              ← Tailwind v4 @theme + global resets
│
├── tests/
│   ├── db.migration.test.js   ← v1→v2 and v2→v3 schema migrations
│   ├── db.results.test.js     ← getResultados ranking & splits
│   ├── components/            ← component-level integration tests
│   ├── pages/                 ← page-level integration tests
│   └── utils/                 ← unit tests for helpers
│
├── docs/                      ← non-code project docs (design notes, planning PDF)
│
├── public/                    ← static assets shipped as-is
│
├── .claude/                   ← Claude Code agents, skills, helpers, hooks
│   ├── agents/                ← project-specific reviewers (ui, offline-pwa, test-gap)
│   ├── skills/                ← race-day invariants (dexie-migration, pwa-offline, csv-safety)
│   ├── commands/, helpers/
│   ├── CLAUDE.md              ← (link target) project rules for Claude
│   └── settings.json          ← shared hooks (settings.local.json is gitignored)
│
├── .github/workflows/         ← CI
├── .mcp.json                  ← MCP server registration
├── CLAUDE.md                  ← project rules surfaced to Claude Code
├── vite.config.js             ← Vite + Tailwind v4 + VitePWA
├── eslint.config.js
└── index.html
```

Tooling (Claude / agentic workflow) lives entirely under `.claude/` and `.mcp.json` —
deleting either has no effect on the application itself.

---

## Architecture notes

### Dexie schema versioning

`src/db.js` keeps every shipped version (currently v1, v2, v3). The
[`dexie-migration`](.claude/skills/dexie-migration/SKILL.md) skill enforces the
discipline: never edit a shipped version; add a new `db.version(N+1)` with
`.upgrade()`. Migrations are covered by `tests/db.migration.test.js`.

### Event lifecycle

`src/utils/estado.js` is the single source of truth for phase labels, color
classes, and the `puedeTransicionar()` gate. Adding new constraints (e.g.
"require ≥1 ola in wave mode") goes here, not scattered through pages.

### Offline PWA

`vite.config.js` uses `vite-plugin-pwa` with Workbox. The `globPatterns` include
`woff2` so the @fontsource files load offline. Runtime caching is `NetworkFirst`
for navigation (3-second timeout) so the app shell ships from cache on race day
even if a captive portal is interfering.

### Cross-tab sync

`src/utils/sync.js` exports a thin BroadcastChannel wrapper. Timing emits
`actualizacion` events; Pantalla listens and re-runs `getResultados()`. Falls
back to 5-second polling if BroadcastChannel is unavailable.

---

## License

Private — all rights reserved (for now). Open-source license TBD.
