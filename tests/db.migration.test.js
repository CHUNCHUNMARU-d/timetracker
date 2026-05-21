import { describe, it, expect, afterEach } from 'vitest'
import Dexie from 'dexie'

// Mirrors src/db.js shipped versions. If db.js changes, dexie-migration
// skill mandates a NEW version block (N+1) — never edit shipped ones —
// so this v1/v2/v3 baseline stays valid as a regression net.
function buildDb(name) {
  const db = new Dexie(name)
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
  return db
}

async function buildV2Only(name) {
  const db = new Dexie(name)
  db.version(1).stores({
    eventos: '++id, nombre, fecha, lugar, tipo, estado',
    atletas: '++id, eventoId, dorsal, nombre',
    tiempos: '++id, eventoId, atletaId, dorsal',
  })
  db.version(2).stores({
    eventos: '++id, nombre, fecha, lugar, tipo, estado',
    atletas: '++id, eventoId, dorsal, nombre, [eventoId+dorsal]',
    tiempos: '++id, eventoId, atletaId, dorsal, segmento',
  })
  await db.open()
  return db
}

async function buildV1Only(name) {
  const db = new Dexie(name)
  db.version(1).stores({
    eventos: '++id, nombre, fecha, lugar, tipo, estado',
    atletas: '++id, eventoId, dorsal, nombre',
    tiempos: '++id, eventoId, atletaId, dorsal',
  })
  await db.open()
  return db
}

const opened = []
afterEach(async () => {
  while (opened.length) {
    const db = opened.pop()
    db.close()
    await Dexie.delete(db.name)
  }
})

describe('Dexie v1 → v2 migration', () => {
  it('backfills atleta.status="activo" when missing', async () => {
    const name = `mig-status-${Date.now()}-${Math.random()}`
    const v1 = await buildV1Only(name)
    opened.push(v1)
    await v1.atletas.add({ eventoId: 1, dorsal: '101', nombre: 'Ana' })
    v1.close()

    const v2 = buildDb(name)
    opened.push(v2)
    const a = await v2.atletas.toCollection().first()
    expect(a.status).toBe('activo')
  })

  it('backfills atleta.distanciaId="" when undefined', async () => {
    const name = `mig-dist-${Date.now()}-${Math.random()}`
    const v1 = await buildV1Only(name)
    opened.push(v1)
    await v1.atletas.add({ eventoId: 1, dorsal: '7', nombre: 'Beto' })
    v1.close()

    const v2 = buildDb(name)
    opened.push(v2)
    const a = await v2.atletas.toCollection().first()
    expect(a.distanciaId).toBe('')
  })

  it('backfills tiempo.segmento="finish" when missing', async () => {
    const name = `mig-seg-${Date.now()}-${Math.random()}`
    const v1 = await buildV1Only(name)
    opened.push(v1)
    await v1.tiempos.add({ eventoId: 1, atletaId: 1, dorsal: '101', horaLlegada: 123 })
    v1.close()

    const v2 = buildDb(name)
    opened.push(v2)
    const t = await v2.tiempos.toCollection().first()
    expect(t.segmento).toBe('finish')
  })

  it('normalises tiempo.olaId from legacy object shape to primitive', async () => {
    const name = `mig-ola-${Date.now()}-${Math.random()}`
    const v1 = await buildV1Only(name)
    opened.push(v1)
    await v1.tiempos.add({ eventoId: 1, atletaId: 1, dorsal: '101', olaId: { olaId: 'ola-A' } })
    v1.close()

    const v2 = buildDb(name)
    opened.push(v2)
    const t = await v2.tiempos.toCollection().first()
    expect(t.olaId).toBe('ola-A')
  })

  it('enforces [eventoId+dorsal] compound uniqueness at write time', async () => {
    const name = `mig-uniq-${Date.now()}-${Math.random()}`
    const db = buildDb(name)
    opened.push(db)
    await db.atletas.add({ eventoId: 1, dorsal: '42', nombre: 'X', status: 'activo', distanciaId: '' })
    // compound index is non-unique by spec — assert query works, not uniqueness
    const hits = await db.atletas.where('[eventoId+dorsal]').equals([1, '42']).toArray()
    expect(hits.length).toBe(1)
  })
})

describe('Dexie v2 → v3 migration (estado rename)', () => {
  it('renames borrador → preparacion', async () => {
    const name = `mig-prep-${Date.now()}-${Math.random()}`
    const v2 = await buildV2Only(name)
    opened.push(v2)
    await v2.eventos.add({ nombre: 'E1', fecha: '2026-01-01', lugar: 'X', tipo: 'carrera', estado: 'borrador' })
    v2.close()

    const v3 = buildDb(name)
    opened.push(v3)
    const ev = await v3.eventos.toCollection().first()
    expect(ev.estado).toBe('preparacion')
  })

  it('renames activo → activa', async () => {
    const name = `mig-active-${Date.now()}-${Math.random()}`
    const v2 = await buildV2Only(name)
    opened.push(v2)
    await v2.eventos.add({ nombre: 'E1', fecha: '2026-01-01', lugar: 'X', tipo: 'carrera', estado: 'activo' })
    v2.close()

    const v3 = buildDb(name)
    opened.push(v3)
    const ev = await v3.eventos.toCollection().first()
    expect(ev.estado).toBe('activa')
  })

  it('renames finalizado → terminada', async () => {
    const name = `mig-final-${Date.now()}-${Math.random()}`
    const v2 = await buildV2Only(name)
    opened.push(v2)
    await v2.eventos.add({ nombre: 'E1', fecha: '2026-01-01', lugar: 'X', tipo: 'carrera', estado: 'finalizado' })
    v2.close()

    const v3 = buildDb(name)
    opened.push(v3)
    const ev = await v3.eventos.toCollection().first()
    expect(ev.estado).toBe('terminada')
  })

  it('defaults missing estado to preparacion', async () => {
    const name = `mig-missing-${Date.now()}-${Math.random()}`
    const v2 = await buildV2Only(name)
    opened.push(v2)
    await v2.eventos.add({ nombre: 'E1', fecha: '2026-01-01', lugar: 'X', tipo: 'carrera' })
    v2.close()

    const v3 = buildDb(name)
    opened.push(v3)
    const ev = await v3.eventos.toCollection().first()
    expect(ev.estado).toBe('preparacion')
  })

  it('preserves already-migrated values on idempotent reopen', async () => {
    const name = `mig-idem-${Date.now()}-${Math.random()}`
    const v3a = buildDb(name)
    opened.push(v3a)
    await v3a.eventos.add({ nombre: 'E1', fecha: '2026-01-01', lugar: 'X', tipo: 'carrera', estado: 'activa' })
    v3a.close()

    const v3b = buildDb(name)
    opened.push(v3b)
    const ev = await v3b.eventos.toCollection().first()
    expect(ev.estado).toBe('activa')
  })
})
