export function msAHora(ms) {
  if (!ms && ms !== 0) return '--:--:--'
  const totalSeg = Math.floor(ms / 1000)
  const h = Math.floor(totalSeg / 3600)
  const m = Math.floor((totalSeg % 3600) / 60)
  const s = totalSeg % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function horaAMs(hora) {
  // "HH:MM" → ms from midnight
  const [h, m] = hora.split(':').map(Number)
  return (h * 60 + m) * 60 * 1000
}

export function ahora() {
  return Date.now()
}

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}
