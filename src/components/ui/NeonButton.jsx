// Stadium Scoreboard action button, uppercase display font.
// Primary is a solid neon fill with dark text (docs/DESIGN.md); the other
// variants are a flat surface with a 1px accent border. Hover lifts to
// accent glow. No gradients, no rounded blobs.

const VARIANTS = {
  primary: {
    bg: 'bg-activa',
    text: 'text-bg',
    border: 'border-activa',
    hover: 'hover:shadow-glow-activa',
    ring: 'focus-ring-activa',
  },
  prep: {
    bg: 'bg-surface',
    text: 'text-prep',
    border: 'border-prep',
    hover: 'hover:shadow-glow-prep',
    ring: 'focus-ring-prep',
  },
  danger: {
    bg: 'bg-surface',
    text: 'text-danger',
    border: 'border-danger',
    hover: 'hover:shadow-glow-danger',
    ring: 'focus-ring-danger',
  },
  ghost: {
    bg: 'bg-surface',
    text: 'text-text-hi hover:text-activa',
    border: 'border-border-hi hover:border-activa',
    hover: '',
    ring: 'focus-ring-activa',
  },
}

const SIZES = {
  sm: 'px-3 py-2 text-xs min-h-[36px]',
  md: 'px-5 py-3 text-sm min-h-[44px]',
  lg: 'px-6 py-4 text-base min-h-[56px]',
  xl: 'px-8 py-5 text-lg min-h-[64px]',
}

export default function NeonButton({
  variant = 'primary',
  size = 'md',
  as = 'button',
  className = '',
  children,
  ...rest
}) {
  const v = VARIANTS[variant] ?? VARIANTS.primary
  const sz = SIZES[size] ?? SIZES.md
  const Tag = as
  return (
    <Tag
      className={`inline-flex items-center justify-center gap-2 font-display font-bold uppercase tracking-wider ${v.bg} border ${v.border} ${v.text} ${v.hover} ${v.ring} ${sz} transition-shadow disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}
