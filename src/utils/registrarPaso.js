import { db } from '../db'
import { ahora } from './tiempo'
import { emitirActualizacion } from './sync'

// Shared dorsal-registration logic used by both /eventos/:id/timing and
// /eventos/:id/scan. Pure with respect to React; takes all state as arguments.
//
// Result is a discriminated union:
//   { ok: true, registro, atleta }
//   { ok: false, code: 'TERMINADA'|'VACIO'|'PAUSADA'|'NO_INICIADA'|'DUPLICADO'
//                     |'CATEGORIA_INCORRECTA'|'WRITE_FAILED', ... }
//
// On success it writes one row to db.tiempos and emits one BroadcastChannel
// message via emitirActualizacion. On any failure it does neither.
export async function registrarPaso({
  eventoId,
  dorsal,
  evento,
  atletas,
  tiempos,
  olaActiva,
  horaInicioGlobal,
  totalPausado = 0,
  pausadoEn,
  esOlas = false,
}) {
  if (evento?.estado === 'terminada') return { ok: false, code: 'TERMINADA' }

  const d = String(dorsal ?? '').trim()
  if (!d) return { ok: false, code: 'VACIO' }

  if (pausadoEn) return { ok: false, code: 'PAUSADA' }

  const horaStart = resolverHoraInicio({ esOlas, olaActiva, evento, horaInicioGlobal })
  if (!horaStart) return { ok: false, code: 'NO_INICIADA' }

  const yaRegistrado = tiempos.find(t => t.dorsal === d)
  if (yaRegistrado) {
    const atleta = atletas.find(a => a.id === yaRegistrado.atletaId) ?? null
    return { ok: false, code: 'DUPLICADO', dorsal: d, atleta }
  }

  const atletaEncontrado = atletas.find(a => a.dorsal === d) ?? null

  if (esOlas && olaActiva && atletaEncontrado && atletaEncontrado.categoriaId !== olaActiva.categoriaId) {
    const catCorrecta = evento.categorias?.find(c => c.id === atletaEncontrado.categoriaId)
    return {
      ok: false,
      code: 'CATEGORIA_INCORRECTA',
      dorsal: d,
      categoriaCorrecta: catCorrecta?.nombre ?? 'otra',
    }
  }

  const horaLlegada = ahora()
  const tiempoNeto = horaLlegada - horaStart - (totalPausado ?? 0)

  const registro = {
    eventoId,
    atletaId: atletaEncontrado?.id ?? null,
    dorsal: d,
    horaLlegada,
    tiempoNeto,
    olaId: olaActiva?.olaId ?? null,
    segmento: 'finish',
    editado: false,
    notaEdicion: '',
  }

  let newId
  try {
    newId = await db.tiempos.add(registro)
  } catch (err) {
    return { ok: false, code: 'WRITE_FAILED', message: err?.message ?? String(err) }
  }

  emitirActualizacion(eventoId)
  return { ok: true, registro: { ...registro, id: newId }, atleta: atletaEncontrado }
}

function resolverHoraInicio({ esOlas, olaActiva, evento, horaInicioGlobal }) {
  if (esOlas && olaActiva) {
    const cat = evento?.categorias?.find(c => c.id === olaActiva.categoriaId)
    const ola = cat?.olas?.find(o => o.id === olaActiva.olaId)
    return ola?.horaInicio ?? horaInicioGlobal
  }
  return horaInicioGlobal
}
