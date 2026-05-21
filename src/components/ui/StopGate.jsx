import { useEffect, useState } from 'react'

// Two-step confirm for terminal actions. First click arms the gate
// (shows the "DETENER" red-glow button); second click within `armWindow`
// invokes onConfirm. Auto-resets if the operator hesitates.
export default function StopGate({ onConfirm, armWindow = 4000, label = '⏹ Terminar', confirmLabel = 'DETENER CARRERA' }) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), armWindow)
    return () => clearTimeout(t)
  }, [armed, armWindow])

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="inline-flex items-center justify-center gap-2 px-6 py-4 min-h-[56px] bg-surface border border-border hover:border-danger text-danger font-display font-bold uppercase tracking-wider transition-colors focus-ring-danger"
      >
        {label}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onConfirm}
      className="inline-flex items-center justify-center gap-2 px-6 py-4 min-h-[56px] bg-danger text-bg font-display font-bold uppercase tracking-wider glow-danger pulse-1s focus-ring-danger"
    >
      ⚠ {confirmLabel}
    </button>
  )
}
