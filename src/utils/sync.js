const CHANNEL = 'cronometraje-sync'

let channel = null

function getChannel() {
  if (!channel && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL)
  }
  return channel
}

export function emitirActualizacion(eventoId) {
  getChannel()?.postMessage({ tipo: 'actualizacion', eventoId })
}

export function escucharActualizaciones(callback) {
  const ch = getChannel()
  if (!ch) return () => {}
  const handler = (e) => {
    if (e.data?.tipo === 'actualizacion') callback(e.data)
  }
  ch.addEventListener('message', handler)
  return () => ch.removeEventListener('message', handler)
}
