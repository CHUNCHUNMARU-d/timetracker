import { LABEL, CLS, ICONO } from '../../utils/estado'

// Compact phase pill — uppercase display font, accent border + glyph.
// Always read-only. For phase transitions, use <PhaseStrip>.
export default function PhaseBadge({ estado, size = 'sm' }) {
  if (!estado) return null
  const cls = CLS[estado] ?? CLS.terminada
  const sizing = size === 'lg'
    ? 'text-sm px-3 py-1.5'
    : 'text-[10px] px-2 py-1'
  return (
    <span
      className={`pill ${cls.text} ${sizing}`}
      aria-label={`Fase ${LABEL[estado]}`}
    >
      <span aria-hidden="true">{ICONO[estado]}</span>
      {LABEL[estado] ?? estado}
    </span>
  )
}
