---
name: pwa-offline-invariants
description: Enforce offline-first invariants when editing src/utils/sync.js, vite.config.js PWA block, src/components/PWAUpdatePrompt.jsx, or any service-worker / cache strategy. Race-day operates without wifi — invoke whenever sync, caching, or SW registration changes.
---

# pwa-offline-invariants

This is a race-timing PWA that runs on phones at outdoor events with no network. The offline contract is: every screen renders, every action persists, and nothing in the timing loop touches the network. Treat this skill as rigid — do not relax invariants for "small" changes.

## When to use

Invoke whenever an edit touches any of:

- `src/utils/sync.js` (BroadcastChannel cross-tab sync)
- `src/db.js` (Dexie reads/writes)
- `vite.config.js` — the `VitePWA({...})` block, `workbox`, `manifest`, or `registerType`
- `src/components/PWAUpdatePrompt.jsx`
- `src/main.jsx` / `src/App.jsx` — service worker registration
- Anything that adds `fetch`, `XMLHttpRequest`, `axios`, or third-party SDKs to a render path

## Invariants (must all hold after every edit)

1. **No `fetch` in render or timing paths.** `Timing.jsx`, `Pantalla.jsx`, and `db.js` must never call the network during normal operation. EmailJS and the only outbound calls live in user-initiated handlers, never in `useEffect` mount or render bodies.
2. **All reads/writes go through Dexie.** No `localStorage` for race data — it has size limits and no transactions. `sessionStorage` is fine only for UI state.
3. **`sync.js` must work when BroadcastChannel is undefined.** It already guards `typeof BroadcastChannel !== 'undefined'` — preserve that guard. iOS Safari < 15.4 has no BC.
4. **`navigateFallback: '/index.html'` stays.** SPA routing depends on it. `navigateFallbackDenylist` must keep `/^\/api\//` to avoid masking future API calls.
5. **`workbox.globPatterns` covers every asset extension the build emits.** Currently `js, css, html, ico, png, svg, woff2`. If you add a font format, image format, or `.json` data file, add the extension or the asset is not precached.
6. **`registerType: 'prompt'`** — never silently change to `autoUpdate`. The user must approve an update because a forced reload mid-race wipes UI state. `PWAUpdatePrompt.jsx` owns the prompt.
7. **Manifest `lang: 'es'`** and `start_url: '/'` must not change without a version bump in `package.json` — changing `start_url` invalidates the installed PWA shortcut.
8. **No new top-level dependency that ships its own service worker** (Firebase, OneSignal, Sentry SW). Two SWs in one origin race-condition each other.
9. **Cross-tab updates use `emitirActualizacion`/`escucharActualizaciones`.** Never call `window.location.reload()` to sync tabs.
10. **Schema changes are someone else's job** — defer to `dexie-migration` skill before changing `src/db.js`.

## Checklist before approving an edit

Create a TodoWrite per item:

1. **Identify the invariant(s) the change could violate.** State which one(s) explicitly before editing.
2. **Run `grep -rn "fetch(" src/` after the edit.** Confirm no new call site in render paths. EmailJS, papaparse, jspdf — none of these should be in `useEffect(() => { ... }, [])` without a user gesture.
3. **If `vite.config.js` PWA block changed**, run `npm run build` and inspect `dist/sw.js` exists and `dist/manifest.webmanifest` matches the source manifest.
4. **If `globPatterns` changed**, run the build and check `ls dist/assets/` to confirm every emitted file extension is covered.
5. **If `sync.js` changed**, verify the BroadcastChannel guard is intact. Add a test in `tests/utils/` if the surface grew.
6. **Manual offline smoke**: `npm run dev`, open DevTools → Application → Service Workers → check "Offline", reload the page. App must still render, navigate, and accept timing input. Critical for Timing.jsx and Pantalla.jsx.
7. **Manual update smoke** if `PWAUpdatePrompt` or `registerType` changed: build → preview → bump a string → rebuild → open preview again, confirm prompt appears and only reloads on click.

## Failure modes to avoid

| Mistake | Race-day consequence |
|---|---|
| Adding `fetch` to a `useEffect` on Timing.jsx | App hangs on slow/no network mid-race. |
| Switching to `registerType: 'autoUpdate'` | Service worker reloads timing screen mid-event, loses unsaved state. |
| Forgetting to add new asset extension to `globPatterns` | First offline load 404s, user sees blank screen. |
| Using `localStorage` for an athlete/time field | Silent data loss at ~5 MB; no transaction guarantees. |
| Adding a SDK that registers its own SW | Update prompts fight, cache invalidation breaks. |
| Calling `window.location.reload()` on cross-tab sync | Wipes Timing.jsx in-memory queue. |

## Reference

- BroadcastChannel sync entry point: `src/utils/sync.js:12`
- Service worker registration / update prompt: `src/components/PWAUpdatePrompt.jsx`
- PWA build config: `vite.config.js` → `VitePWA({...})`
- Manifest source of truth: `vite.config.js` `manifest:` block (NOT `public/manifest.webmanifest` — that is generated)
