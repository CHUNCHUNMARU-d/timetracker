---
name: gen-test
description: Scaffold Vitest + React Testing Library tests for this project. Use when generating tests for pages/components.
disable-model-invocation: true
---

# gen-test

Generate Vitest + React Testing Library tests.

## One-time setup

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Add to `vite.config.js` (inside `defineConfig({...})`):

```js
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./tests/setup.js'],
}
```

Add scripts to `package.json`:

```json
"test": "vitest",
"test:run": "vitest run"
```

Create `tests/setup.js`:

```js
import '@testing-library/jest-dom'
```

## Per-test pattern

- Place tests in `tests/` mirroring `src/` layout
- Mock `src/db.js` with `vi.mock('../src/db.js', ...)` — never hit real Dexie
- Wrap router-aware pages in `<MemoryRouter>`
- Spanish UI: assert exact strings (`Inicio`, `Resultados`, `Nuevo Evento`)
- Smoke test first: render + check key element. Then expand.

## Priority order for this project

1. `src/utils/tiempo.js` — pure functions, easiest wins
2. `src/utils/pdf.js`, `src/utils/share.js` — pure, mock jspdf
3. `src/pages/Timing.jsx` — core flow, race-day critical
4. `src/components/ImportarCSV.jsx` — papaparse boundary
