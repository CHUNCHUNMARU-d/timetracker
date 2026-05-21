---
name: pdf-export-template
description: Use when editing src/utils/pdf.js or adding new PDF exports (per-category podium, certificates, sponsor pages). Keeps jsPDF + jspdf-autotable output consistent and Spanish-localised.
disable-model-invocation: true
---

# pdf-export-template

Race-day PDFs print in the field, on phones, in WhatsApp. They must be readable at A4 and look like an official document. Use this as the canonical shape.

## Header block (always)

```js
const doc = new jsPDF()

doc.setFontSize(18)
doc.text(evento.nombre, 14, 20)

doc.setFontSize(10)
doc.setTextColor(100)
doc.text(`${evento.lugar} · ${evento.fecha} · ${evento.tipo}`, 14, 28)
doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 34)
```

Always `es-MX` locale. Always include `lugar`, `fecha`, `tipo`. Sponsor logo slot (TBD): reserve `y=10..40, x=160..195` (upper right).

## autoTable defaults

```js
autoTable(doc, {
  startY: 42,
  head: [[/* Spanish headers */]],
  body: filas.map(/* … */),
  styles: { fontSize: 9 },
  headStyles: { fillColor: [15, 23, 42] },        // slate-900
  alternateRowStyles: { fillColor: [241, 245, 249] }, // slate-100
})
```

Page numbers, footer text, and extra columns go *after* this block — never replace the defaults.

## Time formatting

Always run `msAHora(tiempoNeto)` from `src/utils/tiempo.js`. Never reimplement `padStart`-based formatting in `pdf.js`. The fallback `--:--:--` for `null` is part of the contract — leave it.

## Filename

`resultados_${evento.nombre.replace(/\s+/g, '_')}.pdf` — keep underscores, no diacritic stripping (Spanish names are part of the brand).

## When adding a new export

| Target | Header columns | Sort | Filter |
|--------|----------------|------|--------|
| General | `# Dorsal Nombre Categoría Distancia Tiempo Cat.` | by `tiempoNeto` asc | `status === 'activo'` |
| Per categoría | `# Dorsal Nombre Tiempo` | by `lugarCategoria` asc | by `categoriaId` |
| Podio | `Lugar Dorsal Nombre Tiempo` | top 3 per category | `lugarCategoria ≤ 3` |
| Certificado | (no table, one-per-page) | n/a | one `atletaId` |

## Tests that must pass

`tests/utils/pdf.test.js`:
- header text written via `text("Carrera X", 14, 20)`
- filename sanitised: spaces → underscores
- empty `filas` does not throw, body is `[]`
- `tiempoNeto` rendered via `msAHora`

## Anti-patterns

- Inline `padStart` for time — always `msAHora`.
- Multiple `doc.save()` per export — one per file.
- `setFontSize` larger than 24 or smaller than 7 — A4 print breaks both ways.
- `setTextColor` outside the `{ [100], [0], [15,23,42] }` set — keeps the brand consistent.
- Translating strings to English. Spanish-only PWA — the language hook will block JSX, but PDFs need this rule too.
