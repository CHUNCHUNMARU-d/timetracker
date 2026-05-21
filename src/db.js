import Dexie from 'dexie'

export const db = new Dexie('cronometraje')

db.version(1).stores({
  eventos: '++id, nombre, fecha, lugar, tipo, estado',
  atletas: '++id, eventoId, dorsal, nombre',
  tiempos: '++id, eventoId, atletaId, dorsal',
})

db.version(2).stores({
  eventos: '++id, nombre, fecha, lugar, tipo, estado',
  atletas: '++id, eventoId, dorsal, nombre, [eventoId+dorsal]',
  tiempos: '++id, eventoId, atletaId, dorsal, segmento',
}).upgrade(async tx => {
  await tx.atletas.toCollection().modify(a => {
    if (!a.status) a.status = 'activo'
    if (a.distanciaId === undefined) a.distanciaId = ''
  })
  await tx.tiempos.toCollection().modify(t => {
    if (!t.segmento) t.segmento = 'finish'
    if (t.olaId && typeof t.olaId === 'object') {
      t.olaId = t.olaId.olaId ?? null
    }
  })
})

// v3 — Renames evento.estado values for the explicit lifecycle:
//   borrador   → preparacion
//   activo     → activa
//   finalizado → terminada
// Indexes and table list unchanged. ALL tables are listed (Dexie drops
// any table omitted in a new version block).
db.version(3).stores({
  eventos: '++id, nombre, fecha, lugar, tipo, estado',
  atletas: '++id, eventoId, dorsal, nombre, [eventoId+dorsal]',
  tiempos: '++id, eventoId, atletaId, dorsal, segmento',
}).upgrade(async tx => {
  const map = { borrador: 'preparacion', activo: 'activa', finalizado: 'terminada' }
  await tx.eventos.toCollection().modify(e => {
    if (map[e.estado]) e.estado = map[e.estado]
    else if (!e.estado) e.estado = 'preparacion'
  })
})

// ── Eventos ─────────────────────────────────────────────────────────────────
// { id, nombre, fecha (ISO), lugar, tipo,
//   estado: 'preparacion'|'activa'|'terminada',
//   configuracion: { inicioTipo, horaInicio, pausadoEn, totalPausado, olaActiva },
//   categorias, distancias }
// ── Atletas ──────────────────────────────────────────────────────────────────
// { id, eventoId, dorsal, nombre, apellido, genero, añoNacimiento,
//   categoriaId, olaId, distanciaId, status: 'activo'|'dns'|'dnf'|'dsq',
//   email, telefono }
// ── Tiempos ───────────────────────────────────────────────────────────────────
// { id, eventoId, atletaId, dorsal, horaLlegada, tiempoNeto,
//   olaId (string), segmento: 'swim'|'bike'|'run'|'finish',
//   editado, notaEdicion }

export async function getEventoConDatos(eventoId) {
  try {
    const evento = await db.eventos.get(eventoId)
    if (!evento) return null
    const atletas = await db.atletas.where('eventoId').equals(eventoId).toArray()
    const tiempos = await db.tiempos.where('eventoId').equals(eventoId).toArray()
    return { evento, atletas, tiempos }
  } catch (err) {
    console.error('getEventoConDatos failed:', err)
    return null
  }
}

export async function getResultados(eventoId) {
  const datos = await getEventoConDatos(eventoId)
  if (!datos) return { evento: null, filas: [] }
  const { evento, atletas, tiempos } = datos

  const finishByAtleta = {}
  const splitsByAtleta = {}
  tiempos.forEach(t => {
    const seg = t.segmento ?? 'finish'
    const aid = t.atletaId
    if (aid == null) return
    if (seg === 'finish') {
      if (!finishByAtleta[aid] || t.horaLlegada > finishByAtleta[aid].horaLlegada) {
        finishByAtleta[aid] = t
      }
    } else {
      splitsByAtleta[aid] = splitsByAtleta[aid] ?? {}
      const prev = splitsByAtleta[aid][seg]
      if (!prev || t.horaLlegada > prev.horaLlegada) splitsByAtleta[aid][seg] = t
    }
  })

  const activas = atletas
    .filter(a => (a.status ?? 'activo') === 'activo' && finishByAtleta[a.id])
    .map(a => buildRow(a, finishByAtleta[a.id], splitsByAtleta[a.id], evento))
    .sort((a, b) => a.tiempoNeto - b.tiempoNeto)

  activas.forEach((f, i) => { f.lugarGeneral = i + 1 })
  const catCounts = {}
  activas.forEach(f => {
    const key = `${f.categoriaId}_${f.olaId}`
    catCounts[key] = (catCounts[key] ?? 0) + 1
    f.lugarCategoria = catCounts[key]
  })

  const inactivas = atletas
    .filter(a => (a.status ?? 'activo') !== 'activo')
    .map(a => {
      const row = buildRow(a, finishByAtleta[a.id], splitsByAtleta[a.id], evento)
      row.lugarGeneral = null
      row.lugarCategoria = null
      return row
    })

  return { evento, filas: [...activas, ...inactivas] }
}

function buildRow(a, finish, splits, evento) {
  const cat = evento.categorias?.find(c => c.id === a.categoriaId)
  const ola = cat?.olas?.find(o => o.id === a.olaId)
  const dist = evento.distancias?.find(d => d.id === a.distanciaId)
  const splitTimes = {}
  if (splits) {
    for (const [seg, t] of Object.entries(splits)) splitTimes[seg] = t.tiempoNeto
  }
  return {
    atletaId: a.id,
    dorsal: a.dorsal,
    nombre: `${a.nombre ?? ''} ${a.apellido ?? ''}`.trim(),
    genero: a.genero,
    categoria: cat?.nombre ?? '',
    categoriaId: a.categoriaId,
    ola: ola?.nombre ?? '',
    olaId: a.olaId,
    distancia: dist?.nombre ?? '',
    distanciaId: a.distanciaId ?? '',
    status: a.status ?? 'activo',
    tiempoNeto: finish?.tiempoNeto ?? null,
    horaLlegada: finish?.horaLlegada ?? null,
    editado: finish?.editado ?? false,
    notaEdicion: finish?.notaEdicion ?? '',
    splits: splitTimes,
    tieneSplits: Object.keys(splitTimes).length > 0,
  }
}
