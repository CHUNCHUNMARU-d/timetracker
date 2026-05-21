import { forwardRef } from 'react'

// Bib input + register button. Race-day primary action — oversized digits
// and 64px+ tap target. Locked overlay when disabled (race not active).
const BibTally = forwardRef(function BibTally(
  { value, onChange, onSubmit, disabled = false, lockReason },
  ref,
) {
  return (
    <div className={`w-full max-w-sm relative ${disabled ? 'pointer-events-none' : ''}`}>
      <label
        htmlFor="bib-input"
        className="block font-display text-[10px] uppercase tracking-[0.3em] text-text-lo mb-2 text-center"
      >
        Dorsal
      </label>
      <input
        ref={ref}
        id="bib-input"
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        onKeyDown={e => e.key === 'Enter' && onSubmit()}
        placeholder="—"
        aria-label="Número de dorsal"
        disabled={disabled}
        className={`w-full text-center digits text-7xl md:text-8xl font-bold bg-surface border-2 ${disabled ? 'border-border text-text-lo' : 'border-border-hi focus:border-activa text-text-hi'} py-8 outline-none transition-colors focus-ring-activa disabled:opacity-50`}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || !value?.trim()}
        className="w-full mt-3 bg-activa text-bg font-display font-bold uppercase tracking-wider text-xl py-5 min-h-[64px] disabled:opacity-30 disabled:cursor-not-allowed hover:glow-activa transition-shadow focus-ring-activa"
      >
        ✓ Registrar llegada
      </button>
      {disabled && lockReason && (
        <div
          aria-live="polite"
          className="absolute inset-0 flex items-center justify-center bg-bg/70 backdrop-blur-[2px] pointer-events-none"
        >
          <div className="border border-border-hi bg-elevated px-4 py-2 text-text-mid font-display text-xs uppercase tracking-widest">
            🔒 {lockReason}
          </div>
        </div>
      )}
    </div>
  )
})

export default BibTally
