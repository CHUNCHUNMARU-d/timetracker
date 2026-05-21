import { FASES, LABEL, CLS, ICONO, siguienteFase, puedeTransicionar } from '../../utils/estado'
import NeonButton from './NeonButton'

// Three-segment lifecycle bar. Past phases = check, current = glow,
// future = muted. The "Avanzar" CTA is rendered alongside; clicking it
// asks the parent to open the confirmation modal (parent owns the flow).
export default function PhaseStrip({ evento, atletas, onAvanzar }) {
  const actual = evento?.estado ?? 'preparacion'
  const idxActual = FASES.indexOf(actual)
  const next = siguienteFase(actual)
  const check = next ? puedeTransicionar(evento, atletas, actual, next) : { ok: false, motivo: 'Sin más fases' }

  return (
    <div className="bg-surface border border-border p-4 md:p-5 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {FASES.map((f, i) => {
          const isCurrent = i === idxActual
          const isPast = i < idxActual
          const cls = CLS[f]
          let stateCls = 'border-border text-text-lo'
          if (isPast) stateCls = 'border-activa/40 text-activa/60'
          if (isCurrent) stateCls = `${cls.border} ${cls.text} ${cls.glow}`
          return (
            <div
              key={f}
              className={`flex flex-col items-center justify-center gap-1 border ${stateCls} py-3 px-2 transition-shadow`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className="text-2xl leading-none" aria-hidden="true">
                {isPast ? '✓' : ICONO[f]}
              </span>
              <span className="font-display text-[11px] uppercase tracking-widest font-bold">
                {LABEL[f]}
              </span>
            </div>
          )
        })}
      </div>

      {next && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-text-mid text-xs font-display uppercase tracking-wider">
            {check.ok
              ? <>Lista para avanzar a <span className={CLS[next].text}>{LABEL[next]}</span></>
              : <span className="text-danger">⚠ {check.motivo}</span>}
          </div>
          <NeonButton
            variant={next === 'terminada' ? 'danger' : 'primary'}
            size="md"
            disabled={!check.ok}
            onClick={() => onAvanzar?.(next)}
          >
            Avanzar → {LABEL[next]}
          </NeonButton>
        </div>
      )}
    </div>
  )
}
