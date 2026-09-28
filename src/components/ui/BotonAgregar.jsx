// Dashed, full-width "add" action. Reads as a button rather than a text link
// and meets the 48px touch target from docs/DESIGN.md.
export default function BotonAgregar({ children, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={`w-full min-h-[48px] inline-flex items-center justify-center gap-2 border-2 border-dashed border-border-hi text-text-hi hover:border-activa hover:text-activa font-display text-xs font-bold uppercase tracking-widest transition-colors focus-ring-activa ${className}`}
      {...rest}
    >
      <span aria-hidden="true" className="text-base leading-none">＋</span>
      {children}
    </button>
  )
}
