import { msAHora } from '../../utils/tiempo'

// Oversized scoreboard digits. Three visual modes:
//   running  — accent green, subtle 1Hz pulse
//   paused   — amber, no animation
//   frozen   — green, no animation (race is over, final time locked)
//
// The hairline rule under the digits is the "underlay" — a classic
// scoreboard cue that the value is being tracked live.
export default function RaceClock({ value = 0, state = 'running', size = 'lg', label }) {
  const COLORS = {
    running: 'text-activa',
    paused: 'text-prep',
    frozen: 'text-activa',
  }
  const SIZES = {
    md: 'text-4xl md:text-5xl',
    lg: 'text-6xl md:text-7xl',
    xl: 'text-7xl md:text-9xl',
  }
  const color = COLORS[state] ?? COLORS.running
  const sz = SIZES[size] ?? SIZES.lg
  const pulse = state === 'running' ? 'pulse-1s' : ''
  return (
    <div className="flex flex-col items-center select-none" role="timer" aria-live="off">
      {label && (
        <span className="text-text-lo text-[10px] uppercase tracking-[0.3em] mb-2 font-display">
          {label}
        </span>
      )}
      <div className={`digits font-bold ${sz} ${color} ${pulse} leading-none`}>
        {msAHora(value)}
      </div>
      <div className={`h-px w-32 mt-3 ${color === 'text-activa' ? 'bg-activa/40' : 'bg-prep/40'}`} aria-hidden="true" />
      {state === 'paused' && (
        <span className="text-prep text-xs font-display uppercase tracking-widest mt-2">⏸ Pausado</span>
      )}
      {state === 'frozen' && (
        <span className="text-activa text-xs font-display uppercase tracking-widest mt-2">■ Tiempo final</span>
      )}
    </div>
  )
}
