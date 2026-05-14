import Dexie from 'dexie'

export const db = new Dexie('cronometraje')

db.version(1).stores({
  eventos: '++id, nombre, fecha, lugar, tipo, estado',
  atletas: '++id, eventoId, dorsal, nombre',
  tiempos: '++id, eventoId, atletaId, dorsal',
})

// ── Eventos ─────────────────────────────────────────────────────────────────
// {
//   id, nombre, fecha (ISO string), lugar, tipo, estado (borrador|activo|finalizado),
//   configuracion: {
//     inicioTipo: 'unico' | 'olas',
//     horaInicio: number (ms) | null,          ← for 'unico'
//     olas: [{ id, nombre, horaInicio: ms | null, categoriaIds: [] }]
//   },
//   categorias: [{ id, nombre, genero, edadMin, edadMax }],
//   distancias: [{ id, nombre }]
// }

// ── Atletas ──────────────────────────────────────────────────────────────────
// {
//   id, eventoId, dorsal (string), nombre, apellido, genero ('M'|'F'),
//   añoNacimiento (number), categoriaId, distanciaId, email, telefono
// }

// ── Tiempos ───────────────────────────────────────────────────────────────────
// {
//   id, eventoId, atletaId, dorsal,
//   horaLlegada (ms), tiempoNeto (ms),
//   olaId (string | null), editado (bool), notaEdicion (string)
// }

export async function getEventoConDatos(eventoId) {
  const evento = await db.eventos.get(eventoId)
  if (!evento) return null
  const atletas = await db.atletas.where('eventoId').equals(eventoId).toArray()
  const tiempos = await db.tiempos.where('eventoId').equals(eventoId).toArray()
  return { evento, atletas, tiempos }
}

export async function getResultados(eventoId) {
  const { evento, atletas, tiempos } = await getEventoConDatos(eventoId)

  const tiempoMap = {}
  tiempos.forEach(t => { tiempoMap[t.atletaId] = t })

  const filas = atletas
    .filter(a => tiempoMap[a.id])
    .map(a => {
      const t = tiempoMap[a.id]
      const cat = evento.categorias?.find(c => c.id === a.categoriaId)
      const dist = evento.distancias?.find(d => d.id === a.distanciaId)
      return {
        atletaId: a.id,
        dorsal: a.dorsal,
        nombre: `${a.nombre} ${a.apellido}`,
        genero: a.genero,
        categoria: cat?.nombre ?? '',
        categoriaId: a.categoriaId,
        distancia: dist?.nombre ?? '',
        distanciaId: a.distanciaId,
        tiempoNeto: t.tiempoNeto,
        editado: t.editado,
      }
    })
    .sort((a, b) => a.tiempoNeto - b.tiempoNeto)

  // Assign overall place
  filas.forEach((f, i) => { f.lugarGeneral = i + 1 })

  // Assign category place
  const categoryCounts = {}
  filas.forEach(f => {
    const key = `${f.categoriaId}_${f.distanciaId}`
    categoryCounts[key] = (categoryCounts[key] ?? 0) + 1
    f.lugarCategoria = categoryCounts[key]
  })

  return { evento, filas }
}
