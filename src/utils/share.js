import { msAHora } from './tiempo'

export function compartirWhatsApp(atleta, tiempo, evento) {
  const msg = `🏅 *${evento.nombre}*\n` +
    `👤 ${atleta.nombre} ${atleta.apellido}\n` +
    `⏱ Tiempo: *${msAHora(tiempo.tiempoNeto)}*\n` +
    `🏆 Lugar general: ${tiempo.lugarGeneral}\n` +
    `📊 Lugar en categoría: ${tiempo.lugarCategoria}\n` +
    `📍 ${evento.lugar} · ${evento.fecha}`

  const numero = atleta.telefono?.replace(/\D/g, '')
  const url = numero
    ? `https://wa.me/52${numero}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`

  window.open(url, '_blank')
}

export async function enviarEmailResultado(atleta, tiempo, evento, emailjsConfig) {
  const { send } = await import('@emailjs/browser')
  return send(
    emailjsConfig.serviceId,
    emailjsConfig.templateId,
    {
      to_name: `${atleta.nombre} ${atleta.apellido}`,
      to_email: atleta.email,
      evento: evento.nombre,
      lugar: evento.lugar,
      fecha: evento.fecha,
      tiempo: msAHora(tiempo.tiempoNeto),
      lugar_general: tiempo.lugarGeneral,
      lugar_categoria: tiempo.lugarCategoria,
      categoria: tiempo.categoria,
    },
    emailjsConfig.publicKey,
  )
}
