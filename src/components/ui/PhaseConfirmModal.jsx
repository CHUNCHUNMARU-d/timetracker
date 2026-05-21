import { LABEL, CLS, puedeTransicionar } from '../../utils/estado'
import NeonButton from './NeonButton'

// Race-day safety gate. Shows a summary of what the operator is about
// to commit (athletes, categorías, olas) plus any blockers from
// puedeTransicionar(). Confirm is disabled while blockers exist.
export default function PhaseConfirmModal({ evento, atletas, desde, hasta, onConfirm, onCancel }) {
  const check = puedeTransicionar(evento, atletas, desde, hasta)
  const variant = hasta === 'terminada' ? 'danger' : 'primary'

  const numAtletas = atletas?.length ?? 0
  const numCategorias = evento?.categorias?.length ?? 0
  const olas = evento?.categorias?.flatMap(c => c.olas ?? []) ?? []
  const inicioTipo = evento?.configuracion?.inicioTipo ?? 'unico'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="phase-confirm-title"
      className="fixed inset-0 bg-bg/90 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onCancel}
    >
      <div
        className="bg-elevated border border-border max-w-md w-full p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <header className="space-y-1">
          <div className="font-display text-[10px] uppercase tracking-[0.3em] text-text-lo">
            Cambio de fase
          </div>
          <h2 id="phase-confirm-title" className="font-display text-2xl font-bold">
            <span className="text-text-lo">{LABEL[desde]}</span>
            <span className="text-text-lo mx-2">→</span>
            <span className={CLS[hasta].text}>{LABEL[hasta]}</span>
          </h2>
        </header>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Atletas" value={numAtletas} ok={numAtletas > 0} />
          <Stat label="Categorías" value={numCategorias} ok={numCategorias > 0} />
          <Stat label="Inicio" value={inicioTipo === 'olas' ? 'Por olas' : 'Único'} ok />
          <Stat label="Olas" value={olas.length} ok />
        </dl>

        {!check.ok && (
          <div className="border border-danger/50 bg-danger/10 px-3 py-2 text-danger text-sm font-display uppercase tracking-wider">
            ⚠ {check.motivo}
          </div>
        )}

        {hasta === 'terminada' && check.ok && (
          <p className="text-text-mid text-xs leading-relaxed">
            Al confirmar, la carrera quedará bloqueada. No se podrán registrar nuevos
            tiempos ni modificar la configuración. Esta acción es definitiva.
          </p>
        )}

        <div className="flex gap-3">
          <NeonButton variant="ghost" size="md" onClick={onCancel} className="flex-1">
            Cancelar
          </NeonButton>
          <NeonButton
            variant={variant}
            size="md"
            disabled={!check.ok}
            onClick={onConfirm}
            className="flex-1"
          >
            Confirmar
          </NeonButton>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, ok }) {
  return (
    <div className="bg-surface border border-border px-3 py-2">
      <dt className="text-text-lo text-[10px] font-display uppercase tracking-widest">{label}</dt>
      <dd className={`text-xl font-mono font-bold ${ok ? 'text-text-hi' : 'text-danger'}`}>{value}</dd>
    </div>
  )
}
