// Phase lifecycle source of truth. Imported everywhere `estado` is read
// or written so labels, colors, and transition rules stay aligned.
//
// DB values are `preparacion` | `activa` | `terminada` (migrated in db.js v3).

export const FASES = ['preparacion', 'activa', 'terminada']

export const LABEL = {
  preparacion: 'Preparación',
  activa: 'Activa',
  terminada: 'Terminada',
}

// Pre-resolved Tailwind classes per phase. Literal strings only — Tailwind v4
// scans sources for full class names, so dynamic interpolation breaks the JIT.
export const CLS = {
  preparacion: {
    text:   'text-prep',
    border: 'border-prep',
    bg:     'bg-prep',
    glow:   'glow-prep',
    ring:   'focus-ring-prep',
    edge:   'before:bg-prep',
  },
  activa: {
    text:   'text-activa',
    border: 'border-activa',
    bg:     'bg-activa',
    glow:   'glow-activa',
    ring:   'focus-ring-activa',
    edge:   'before:bg-activa',
  },
  terminada: {
    text:   'text-terminada',
    border: 'border-terminada',
    bg:     'bg-terminada',
    glow:   '',
    ring:   'focus-ring-activa',
    edge:   'before:bg-terminada',
  },
}

export const ICONO = {
  preparacion: '◐',
  activa: '●',
  terminada: '■',
}

// Returns { ok: true } or { ok: false, motivo: '...' }
export function puedeTransicionar(evento, atletas, desde, hasta) {
  if (!FASES.includes(hasta)) return { ok: false, motivo: 'Fase inválida' }
  if (evento?.estado !== desde) return { ok: false, motivo: 'Fase de origen incorrecta' }

  const fromIdx = FASES.indexOf(desde)
  const toIdx = FASES.indexOf(hasta)
  if (toIdx !== fromIdx + 1) {
    return { ok: false, motivo: 'No se pueden saltar fases ni retroceder' }
  }

  if (desde === 'preparacion' && hasta === 'activa') {
    const numAtletas = atletas?.length ?? 0
    const numCategorias = evento?.categorias?.length ?? 0
    const faltan = []
    if (numAtletas < 1) faltan.push('≥1 atleta')
    if (numCategorias < 1) faltan.push('≥1 categoría')
    if (faltan.length) {
      return { ok: false, motivo: `Falta: ${faltan.join(' y ')}` }
    }
  }

  return { ok: true }
}

export function esEditable(evento) {
  return evento?.estado === 'preparacion'
}

export function puedeRegistrarTiempos(evento) {
  return evento?.estado === 'activa'
}

export function esTerminada(evento) {
  return evento?.estado === 'terminada'
}

export function siguienteFase(estado) {
  const idx = FASES.indexOf(estado)
  if (idx === -1 || idx === FASES.length - 1) return null
  return FASES[idx + 1]
}
