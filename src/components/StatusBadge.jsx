const STYLES = {
  dns: 'text-text-lo border-text-lo',
  dnf: 'text-prep border-prep',
  dsq: 'text-danger border-danger',
}

const LABELS = { dns: 'DNS', dnf: 'DNF', dsq: 'DSQ' }

export default function StatusBadge({ status, size = 'sm' }) {
  if (!status || status === 'activo') return null
  const sz = size === 'lg' ? 'text-sm px-3 py-1' : 'text-[10px] px-2 py-0.5'
  return (
    <span
      className={`inline-block font-display font-bold uppercase tracking-widest border ${sz} ${STYLES[status] ?? 'text-text-mid border-border'}`}
    >
      {LABELS[status] ?? status.toUpperCase()}
    </span>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const STATUS_LABELS = {
  activo: 'Activo',
  dns: 'DNS (no salió)',
  dnf: 'DNF (no terminó)',
  dsq: 'DSQ (descalificado)',
}
