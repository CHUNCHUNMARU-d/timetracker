import { db } from '../db'
import { ahora } from './tiempo'
import { emitirActualizacion } from './sync'

// Shared dorsal-registration logic used by both /eventos/:id/timing and
// /eventos/:id/scan. Pure with respect to React; takes all state as arguments.
//
// Result is a discriminated union:
//   { ok: true, registro, atleta }
//   { ok: false, code: 'TERMINADA'|'VACIO'|'PAUSADA'|'NO_INICIADA'|'DUPLICADO'
//                     |'OLA_NO_INICIADA'|'WRITE_FAILED', ... }
//
// In wave mode each finisher is timed from their own ola, so several olas can
// be on course at once. Athletes without an ola in a category with only one
// ola use that one; anything else (no ola, unregistered dorsal) is timed from
// the race start, i.e. the first ola.
//
// On success it writes one row to db.tiempos and emits one BroadcastChannel
// message via emitirActualizacion. On any failure it does neither.
export async function registrarPaso({
  eventoId,
  dorsal,
  evento,
  atletas,
  tiempos,
  horaInicioGlobal,
  totalPausado = 0,
  pausadoEn,
  esOlas = false,
}) {
  if (evento?.estado === 'terminada') return { ok: false, code: 'TERMINADA' }

  const d = String(dorsal ?? '').trim()
  if (!d) return { ok: false, code: 'VACIO' }

  if (pausadoEn) return { ok: false, code: 'PAUSADA' }

  if (!horaInicioGlobal) return { ok: false, code: 'NO_INICIADA' }

  const yaRegistrado = tiempos.find(t => t.dorsal === d)
  if (yaRegistrado) {
    const atleta = atletas.find(a => a.id === yaRegistrado.atletaId) ?? null
    return { ok: false, code: 'DUPLICADO', dorsal: d, atleta }
  }

  const atletaEncontrado = atletas.find(a => a.dorsal === d) ?? null

  const ola = esOlas && atletaEncontrado ? olaDelAtleta(atletaEncontrado, evento) : null
  if (ola && !ola.horaInicio) return { ok: false, code: 'OLA_NO_INICIADA', dorsal: d, ola: ola.nombre }
  const horaStart = ola?.horaInicio ?? horaInicioGlobal

  const horaLlegada = ahora()
  const tiempoNeto = horaLlegada - horaStart - (totalPausado ?? 0)

  const registro = {
    eventoId,
    atletaId: atletaEncontrado?.id ?? null,
    dorsal: d,
    horaLlegada,
    tiempoNeto,
    olaId: ola?.id ?? null,
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

function olaDelAtleta(atleta, evento) {
  const propia = evento?.categorias?.flatMap(c => c.olas ?? []).find(o => o.id === atleta.olaId)
  if (propia) return propia
  const olasCategoria = evento?.categorias?.find(c => c.id === atleta.categoriaId)?.olas ?? []
  return olasCategoria.length === 1 ? olasCategoria[0] : null
}
