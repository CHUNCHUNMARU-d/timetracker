// Database safety / data-integrity test suite.
// Race-day data loss is unrecoverable, so this file exhaustively exercises:
//   - cascading deletes (event → atletas → tiempos)
//   - multi-event isolation
//   - compound-index behavior + the documented duplicate-dorsal gap
//   - transactional rollback semantics
//   - bulkAdd atomicity (the CSV import path)
//   - migration robustness against rich nested data + multiple eventos
//   - round-trip JSON export → re-import
//   - tiempos integrity (orphans, multiple finishes, segments)
//   - edge-value handling (empty / null / very long)
//   - concurrent / interleaved writes

import { describe, it, expect, afterEach } from 'vitest'
import Dexie from 'dexie'

// Helper: a fresh DB matching the shipped schema (v1 → v2 → v3).
// Mirrors src/db.js — kept independent so the production module is never
// implicitly opened against fake-indexeddb mid-suite.
function shippedSchema(name) {
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

const opened = []
afterEach(async () => {
  while (opened.length) {
    const db = opened.pop()
    try { db.close() } catch { /* ignore */ }
    try { await Dexie.delete(db.name) } catch { /* ignore */ }
  }
})

function dbname(label) {
  return `safety-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ─── Cascading delete integrity ────────────────────────────────────────────

describe('Cascading delete (event removal)', () => {
  it('multi-table transaction removes event + its atletas + its tiempos atomically', async () => {
    const db = shippedSchema(dbname('cascade'))
    opened.push(db)

    const eventoId = await db.eventos.add({ nombre: 'E', fecha: '2026-01-01', lugar: 'X', tipo: 'carrera', estado: 'activa' })
    await db.atletas.bulkAdd([
      { eventoId, dorsal: '1', nombre: 'A', status: 'activo', distanciaId: '' },
      { eventoId, dorsal: '2', nombre: 'B', status: 'activo', distanciaId: '' },
    ])
    await db.tiempos.bulkAdd([
      { eventoId, atletaId: 1, dorsal: '1', segmento: 'finish', horaLlegada: 1, tiempoNeto: 100 },
      { eventoId, atletaId: 2, dorsal: '2', segmento: 'finish', horaLlegada: 2, tiempoNeto: 200 },
    ])

    await db.transaction('rw', db.eventos, db.atletas, db.tiempos, async () => {
      await db.eventos.delete(eventoId)
      await db.atletas.where('eventoId').equals(eventoId).delete()
      await db.tiempos.where('eventoId').equals(eventoId).delete()
    })

    expect(await db.eventos.count()).toBe(0)
    expect(await db.atletas.count()).toBe(0)
    expect(await db.tiempos.count()).toBe(0)
  })

  it('rolls back the entire transaction if any inner step throws', async () => {
    const db = shippedSchema(dbname('rollback'))
    opened.push(db)

    const eventoId = await db.eventos.add({ nombre: 'E', fecha: '2026-01-01', lugar: 'X', tipo: 'carrera', estado: 'activa' })
    await db.atletas.add({ eventoId, dorsal: '1', nombre: 'A', status: 'activo', distanciaId: '' })

    await expect(
      db.transaction('rw', db.eventos, db.atletas, db.tiempos, async () => {
        await db.eventos.delete(eventoId)
        await db.atletas.where('eventoId').equals(eventoId).delete()
        throw new Error('boom: simulated race-day failure mid-delete')
      }),
    ).rejects.toThrow(/boom/)

    // Rollback: everything that existed before still exists
    expect(await db.eventos.count()).toBe(1)
    expect(await db.atletas.count()).toBe(1)
  })

  it('does NOT remove atletas/tiempos belonging to other events', async () => {
    const db = shippedSchema(dbname('isolate-delete'))
    opened.push(db)

    const e1 = await db.eventos.add({ nombre: 'E1', fecha: '2026-01-01', lugar: 'X', tipo: 'carrera', estado: 'activa' })
    const e2 = await db.eventos.add({ nombre: 'E2', fecha: '2026-01-02', lugar: 'X', tipo: 'carrera', estado: 'activa' })
    await db.atletas.bulkAdd([
      { eventoId: e1, dorsal: '1', nombre: 'A', status: 'activo', distanciaId: '' },
      { eventoId: e2, dorsal: '1', nombre: 'A2', status: 'activo', distanciaId: '' },
    ])
    await db.tiempos.bulkAdd([
      { eventoId: e1, atletaId: 1, dorsal: '1', segmento: 'finish', horaLlegada: 1, tiempoNeto: 100 },
      { eventoId: e2, atletaId: 2, dorsal: '1', segmento: 'finish', horaLlegada: 2, tiempoNeto: 200 },
    ])

    await db.transaction('rw', db.eventos, db.atletas, db.tiempos, async () => {
      await db.eventos.delete(e1)
      await db.atletas.where('eventoId').equals(e1).delete()
      await db.tiempos.where('eventoId').equals(e1).delete()
    })

    expect(await db.eventos.count()).toBe(1)
    const remainingAtleta = await db.atletas.toCollection().first()
    expect(remainingAtleta.eventoId).toBe(e2)
    const remainingTiempo = await db.tiempos.toCollection().first()
    expect(remainingTiempo.eventoId).toBe(e2)
  })
})

// ─── Multi-event isolation ─────────────────────────────────────────────────

describe('Multi-event isolation (no cross-leakage)', () => {
  it('same dorsal across two different eventos is allowed and queryable independently', async () => {
    const db = shippedSchema(dbname('cross-evt-dorsal'))
    opened.push(db)
    const e1 = await db.eventos.add({ nombre: 'E1', estado: 'activa', tipo: 'carrera' })
    const e2 = await db.eventos.add({ nombre: 'E2', estado: 'activa', tipo: 'carrera' })

    await db.atletas.add({ eventoId: e1, dorsal: '101', nombre: 'A', status: 'activo', distanciaId: '' })
    await db.atletas.add({ eventoId: e2, dorsal: '101', nombre: 'B', status: 'activo', distanciaId: '' })

    const e1Atletas = await db.atletas.where('eventoId').equals(e1).toArray()
    const e2Atletas = await db.atletas.where('eventoId').equals(e2).toArray()
    expect(e1Atletas).toHaveLength(1)
    expect(e2Atletas).toHaveLength(1)
    expect(e1Atletas[0].nombre).toBe('A')
    expect(e2Atletas[0].nombre).toBe('B')
  })

  it('compound [eventoId+dorsal] returns only matching rows', async () => {
    const db = shippedSchema(dbname('compound-q'))
    opened.push(db)
    await db.atletas.bulkAdd([
      { eventoId: 1, dorsal: '7', nombre: 'A', status: 'activo', distanciaId: '' },
      { eventoId: 2, dorsal: '7', nombre: 'B', status: 'activo', distanciaId: '' },
      { eventoId: 1, dorsal: '8', nombre: 'C', status: 'activo', distanciaId: '' },
    ])
    const hits = await db.atletas.where('[eventoId+dorsal]').equals([1, '7']).toArray()
    expect(hits).toHaveLength(1)
    expect(hits[0].nombre).toBe('A')
  })

  it('tiempos query by eventoId never returns rows from another event', async () => {
    const db = shippedSchema(dbname('tiempos-iso'))
    opened.push(db)
    await db.tiempos.bulkAdd([
      { eventoId: 1, atletaId: 10, dorsal: '1', segmento: 'finish', tiempoNeto: 100, horaLlegada: 1 },
      { eventoId: 2, atletaId: 20, dorsal: '1', segmento: 'finish', tiempoNeto: 200, horaLlegada: 2 },
    ])
    const e1 = await db.tiempos.where('eventoId').equals(1).toArray()
    expect(e1).toHaveLength(1)
    expect(e1[0].tiempoNeto).toBe(100)
  })
})

// ─── Compound-index uniqueness gap (documented, not enforced at DB) ────────

describe('Duplicate-dorsal protection (application-level only)', () => {
  it('Dexie does NOT enforce uniqueness on [eventoId+dorsal] — guard MUST be in app code', async () => {
    // This test pins the current contract: the compound index is read-optimised,
    // not unique. If race-day code skips the application-level check, duplicates
    // will land. The guard in DetalleEvento.guardarAtleta / ImportarCSV preview is
    // the single source of protection — keep it covered by integration tests.
    const db = shippedSchema(dbname('dup-gap'))
    opened.push(db)
    await db.atletas.add({ eventoId: 1, dorsal: '42', nombre: 'First', status: 'activo', distanciaId: '' })
    await db.atletas.add({ eventoId: 1, dorsal: '42', nombre: 'Second', status: 'activo', distanciaId: '' })
    const hits = await db.atletas.where('[eventoId+dorsal]').equals([1, '42']).toArray()
    expect(hits.length).toBe(2) // both landed — confirms the gap exists
  })

  it('app-level pattern (lookup-before-write) correctly blocks duplicates', async () => {
    const db = shippedSchema(dbname('dup-app-guard'))
    opened.push(db)
    await db.atletas.add({ eventoId: 1, dorsal: '42', nombre: 'First', status: 'activo', distanciaId: '' })

    // Mirror the guard from DetalleEvento.guardarAtleta:
    async function safeAdd(candidate) {
      const colision = await db.atletas
        .where('[eventoId+dorsal]')
        .equals([candidate.eventoId, candidate.dorsal])
        .first()
      if (colision) throw new Error('duplicate')
      return db.atletas.add(candidate)
    }

    await expect(safeAdd({ eventoId: 1, dorsal: '42', nombre: 'X', status: 'activo', distanciaId: '' })).rejects.toThrow('duplicate')
    expect(await db.atletas.count()).toBe(1)
  })
})

// ─── bulkAdd atomicity (CSV import path) ───────────────────────────────────

describe('bulkAdd atomicity', () => {
  it('inserts all rows successfully when no validation failures occur', async () => {
    const db = shippedSchema(dbname('bulk-ok'))
    opened.push(db)
    const rows = Array.from({ length: 250 }, (_, i) => ({
      eventoId: 1,
      dorsal: String(i + 1),
      nombre: `A${i}`,
      status: 'activo',
      distanciaId: '',
    }))
    await db.atletas.bulkAdd(rows)
    expect(await db.atletas.count()).toBe(250)
  })

  it('bulkAdd inside an explicit RW transaction can be rolled back via abort()', async () => {
    const db = shippedSchema(dbname('bulk-abort'))
    opened.push(db)
    await db.atletas.add({ eventoId: 1, dorsal: 'seed', nombre: 'pre', status: 'activo', distanciaId: '' })

    await expect(
      db.transaction('rw', db.atletas, async tx => {
        await db.atletas.bulkAdd([
          { eventoId: 1, dorsal: 'x', nombre: 'X', status: 'activo', distanciaId: '' },
          { eventoId: 1, dorsal: 'y', nombre: 'Y', status: 'activo', distanciaId: '' },
        ])
        tx.abort()
        // any operation after abort() throws — but the rejection here is what matters
        await db.atletas.add({ eventoId: 1, dorsal: 'z', nombre: 'Z', status: 'activo', distanciaId: '' })
      }),
    ).rejects.toThrow()

    // Only the pre-seeded row remains
    expect(await db.atletas.count()).toBe(1)
    const survivor = await db.atletas.toCollection().first()
    expect(survivor.dorsal).toBe('seed')
  })

  it('handles a large bulkAdd (1000 rows) without truncation', async () => {
    const db = shippedSchema(dbname('bulk-big'))
    opened.push(db)
    const rows = Array.from({ length: 1000 }, (_, i) => ({
      eventoId: 1,
      dorsal: String(i),
      nombre: `Atleta${i}`,
      status: 'activo',
      distanciaId: '',
    }))
    await db.atletas.bulkAdd(rows)
    expect(await db.atletas.count()).toBe(1000)
  })
})

// ─── Migration robustness ──────────────────────────────────────────────────

describe('Migration robustness', () => {
  async function seedV1(name) {
    const db = new Dexie(name)
    db.version(1).stores({
      eventos: '++id, nombre, fecha, lugar, tipo, estado',
      atletas: '++id, eventoId, dorsal, nombre',
      tiempos: '++id, eventoId, atletaId, dorsal',
    })
    await db.open()
    return db
  }

  it('chains v1 → v3 in a single open, migrating each step in order', async () => {
    const name = dbname('chain')
    const v1 = await seedV1(name)
    await v1.eventos.add({ nombre: 'OldEvent', fecha: '2025-01-01', lugar: 'X', tipo: 'carrera', estado: 'activo' })
    await v1.atletas.add({ eventoId: 1, dorsal: '1', nombre: 'OldRunner' })
    await v1.tiempos.add({ eventoId: 1, atletaId: 1, dorsal: '1', horaLlegada: 1, tiempoNeto: 100, olaId: { olaId: 'legacy' } })
    v1.close()

    const db = shippedSchema(name)
    opened.push(db)

    // estado migrated through both upgrades (activo → activa)
    const ev = await db.eventos.toCollection().first()
    expect(ev.estado).toBe('activa')

    // v2 backfills applied
    const at = await db.atletas.toCollection().first()
    expect(at.status).toBe('activo')
    expect(at.distanciaId).toBe('')

    // v2 normalisation of legacy nested olaId
    const t = await db.tiempos.toCollection().first()
    expect(t.segmento).toBe('finish')
    expect(t.olaId).toBe('legacy')
  })

  it('migrates multiple eventos in one shot, mapping each estado correctly', async () => {
    const name = dbname('multi-evt')
    const v1 = await seedV1(name)
    await v1.eventos.bulkAdd([
      { nombre: 'A', estado: 'borrador', tipo: 'carrera' },
      { nombre: 'B', estado: 'activo', tipo: 'carrera' },
      { nombre: 'C', estado: 'finalizado', tipo: 'carrera' },
      { nombre: 'D', estado: undefined, tipo: 'carrera' },
    ])
    v1.close()

    const db = shippedSchema(name)
    opened.push(db)
    const eventos = await db.eventos.orderBy('id').toArray()
    expect(eventos.map(e => e.estado)).toEqual(['preparacion', 'activa', 'terminada', 'preparacion'])
  })

  it('preserves nested configuracion + categorias.olas through migrations', async () => {
    const name = dbname('nested')
    const v1 = await seedV1(name)
    const id = await v1.eventos.add({
      nombre: 'Nested',
      estado: 'activo',
      tipo: 'triatlón',
      configuracion: { inicioTipo: 'olas', horaInicio: 1_000_000, totalPausado: 5_000 },
      categorias: [
        { id: 'cat-A', nombre: 'Élite', olas: [{ id: 'ola-1', nombre: 'Ola 1', horaInicio: 1_000_000 }] },
      ],
      distancias: [{ id: 'd1', nombre: 'Olímpico' }],
    })
    v1.close()

    const db = shippedSchema(name)
    opened.push(db)
    const ev = await db.eventos.get(id)
    expect(ev.configuracion.inicioTipo).toBe('olas')
    expect(ev.configuracion.horaInicio).toBe(1_000_000)
    expect(ev.categorias[0].olas[0].id).toBe('ola-1')
    expect(ev.distancias[0].nombre).toBe('Olímpico')
    expect(ev.estado).toBe('activa') // migrated
  })

  it('opens cleanly on a fresh empty DB at v3 (no upgrade work)', async () => {
    const db = shippedSchema(dbname('fresh'))
    opened.push(db)
    await db.open()
    expect(await db.eventos.count()).toBe(0)
    expect(await db.atletas.count()).toBe(0)
    expect(await db.tiempos.count()).toBe(0)
  })
})

// ─── Tiempos integrity ─────────────────────────────────────────────────────

describe('Tiempos integrity', () => {
  it('stores tiempos with atletaId=null (unknown bib) without losing other rows', async () => {
    const db = shippedSchema(dbname('orphan-tiempo'))
    opened.push(db)
    await db.tiempos.bulkAdd([
      { eventoId: 1, atletaId: null, dorsal: '999', segmento: 'finish', horaLlegada: 1, tiempoNeto: 100 },
      { eventoId: 1, atletaId: 1, dorsal: '1', segmento: 'finish', horaLlegada: 2, tiempoNeto: 200 },
    ])
    const all = await db.tiempos.toArray()
    expect(all).toHaveLength(2)
    expect(all.filter(t => t.atletaId === null)).toHaveLength(1)
  })

  it('keeps multiple finishes per atleta — getResultados pick logic handles dedupe', async () => {
    // DB layer permits multiple finish rows; the getResultados ranker resolves them.
    // This pins the contract: the DB never silently merges or drops duplicate finishes.
    const db = shippedSchema(dbname('multi-finish'))
    opened.push(db)
    await db.tiempos.bulkAdd([
      { eventoId: 1, atletaId: 1, dorsal: '1', segmento: 'finish', horaLlegada: 100, tiempoNeto: 100 },
      { eventoId: 1, atletaId: 1, dorsal: '1', segmento: 'finish', horaLlegada: 200, tiempoNeto: 90 },
    ])
    expect(await db.tiempos.count()).toBe(2)
  })

  it('stores split + finish for the same atleta as separate rows', async () => {
    const db = shippedSchema(dbname('splits'))
    opened.push(db)
    await db.tiempos.bulkAdd([
      { eventoId: 1, atletaId: 1, dorsal: '1', segmento: 'swim',   horaLlegada: 1, tiempoNeto: 500 },
      { eventoId: 1, atletaId: 1, dorsal: '1', segmento: 'bike',   horaLlegada: 2, tiempoNeto: 1500 },
      { eventoId: 1, atletaId: 1, dorsal: '1', segmento: 'finish', horaLlegada: 3, tiempoNeto: 3000 },
    ])
    const byseg = await db.tiempos.where('segmento').equals('finish').toArray()
    expect(byseg).toHaveLength(1)
    expect((await db.tiempos.where('segmento').equals('swim').toArray())).toHaveLength(1)
  })
})

// ─── Edge values ───────────────────────────────────────────────────────────

describe('Edge values & boundary conditions', () => {
  it('accepts empty-string fields without rejecting the row', async () => {
    const db = shippedSchema(dbname('empty'))
    opened.push(db)
    await db.atletas.add({ eventoId: 1, dorsal: '', nombre: '', apellido: '', status: 'activo', distanciaId: '' })
    expect(await db.atletas.count()).toBe(1)
  })

  it('round-trips very long strings (1KB nombre) intact', async () => {
    const db = shippedSchema(dbname('long'))
    opened.push(db)
    const longName = 'A'.repeat(1024)
    await db.atletas.add({ eventoId: 1, dorsal: '1', nombre: longName, status: 'activo', distanciaId: '' })
    const a = await db.atletas.toCollection().first()
    expect(a.nombre).toHaveLength(1024)
  })

  it('round-trips unicode (emoji, accents, RTL) in nombre/dorsal', async () => {
    const db = shippedSchema(dbname('unicode'))
    opened.push(db)
    await db.atletas.add({ eventoId: 1, dorsal: '⚡42', nombre: 'José Ñúñez 🏃‍♂️', apellido: 'مرحبا', status: 'activo', distanciaId: '' })
    const a = await db.atletas.toCollection().first()
    expect(a.dorsal).toBe('⚡42')
    expect(a.nombre).toBe('José Ñúñez 🏃‍♂️')
    expect(a.apellido).toBe('مرحبا')
  })

  it('handles very large tiempoNeto values (>24h) without overflow', async () => {
    const db = shippedSchema(dbname('big-time'))
    opened.push(db)
    const ms = 25 * 60 * 60 * 1000 // 25h in ms
    await db.tiempos.add({ eventoId: 1, atletaId: 1, dorsal: '1', segmento: 'finish', horaLlegada: 1, tiempoNeto: ms })
    const t = await db.tiempos.toCollection().first()
    expect(t.tiempoNeto).toBe(ms)
  })
})

// ─── Round-trip JSON (Pantalla import path) ────────────────────────────────

describe('JSON round-trip (export → re-parse → re-insert)', () => {
  it('survives a full export → JSON.stringify → JSON.parse → write back cycle', async () => {
    const db = shippedSchema(dbname('roundtrip'))
    opened.push(db)
    const evId = await db.eventos.add({
      nombre: 'Round', fecha: '2026-05-21', lugar: 'CDMX', tipo: 'triatlón', estado: 'terminada',
      configuracion: { inicioTipo: 'unico', horaInicio: 1_000_000, totalPausado: 0 },
      categorias: [{ id: 'c1', nombre: 'Cat', olas: [{ id: 'o1', nombre: 'O1' }] }],
      distancias: [{ id: 'd1', nombre: 'Sprint' }],
    })
    await db.atletas.bulkAdd([
      { eventoId: evId, dorsal: '1', nombre: 'A', apellido: 'L', categoriaId: 'c1', olaId: 'o1', status: 'activo', distanciaId: 'd1' },
    ])
    await db.tiempos.add({ eventoId: evId, atletaId: 1, dorsal: '1', segmento: 'finish', horaLlegada: 1_001_000, tiempoNeto: 1_000 })

    // Export
    const snapshot = {
      eventos: await db.eventos.toArray(),
      atletas: await db.atletas.toArray(),
      tiempos: await db.tiempos.toArray(),
    }
    const serialised = JSON.stringify(snapshot)

    // Wipe & re-import
    await db.eventos.clear()
    await db.atletas.clear()
    await db.tiempos.clear()
    expect(await db.eventos.count()).toBe(0)

    const restored = JSON.parse(serialised)
    await db.eventos.bulkPut(restored.eventos)
    await db.atletas.bulkPut(restored.atletas)
    await db.tiempos.bulkPut(restored.tiempos)

    // Verify byte-for-byte equality of the loaded shape
    const ev = await db.eventos.get(evId)
    expect(ev.nombre).toBe('Round')
    expect(ev.configuracion.horaInicio).toBe(1_000_000)
    expect(ev.categorias[0].olas[0].id).toBe('o1')
    expect(await db.atletas.count()).toBe(1)
    expect(await db.tiempos.count()).toBe(1)
    const t = await db.tiempos.toCollection().first()
    expect(t.tiempoNeto).toBe(1_000)
  })
})

// ─── Concurrent / interleaved writes ───────────────────────────────────────

describe('Concurrent writes', () => {
  it('two parallel atleta inserts (different dorsales) both persist', async () => {
    const db = shippedSchema(dbname('concur-ok'))
    opened.push(db)
    await Promise.all([
      db.atletas.add({ eventoId: 1, dorsal: '1', nombre: 'A', status: 'activo', distanciaId: '' }),
      db.atletas.add({ eventoId: 1, dorsal: '2', nombre: 'B', status: 'activo', distanciaId: '' }),
    ])
    expect(await db.atletas.count()).toBe(2)
  })

  it('parallel tiempo writes for different dorsales preserve all rows', async () => {
    const db = shippedSchema(dbname('concur-tiempos'))
    opened.push(db)
    const writes = Array.from({ length: 20 }, (_, i) =>
      db.tiempos.add({ eventoId: 1, atletaId: i, dorsal: String(i), segmento: 'finish', horaLlegada: i, tiempoNeto: i * 100 }),
    )
    await Promise.all(writes)
    expect(await db.tiempos.count()).toBe(20)
  })

  it('an aborted transaction does not leak partial writes when other writes succeed afterwards', async () => {
    const db = shippedSchema(dbname('concur-abort'))
    opened.push(db)

    await expect(
      db.transaction('rw', db.atletas, async tx => {
        await db.atletas.add({ eventoId: 1, dorsal: 'x', nombre: 'X', status: 'activo', distanciaId: '' })
        tx.abort()
      }),
    ).rejects.toThrow()

    expect(await db.atletas.count()).toBe(0)

    // Subsequent independent write still works
    await db.atletas.add({ eventoId: 1, dorsal: 'y', nombre: 'Y', status: 'activo', distanciaId: '' })
    expect(await db.atletas.count()).toBe(1)
  })
})

// ─── Reopen persistence (within a session) ─────────────────────────────────

describe('Reopen persistence', () => {
  it('data written, db closed, db reopened — data is still there', async () => {
    const name = dbname('reopen')
    const db1 = shippedSchema(name)
    opened.push(db1)
    await db1.eventos.add({ nombre: 'Persist', estado: 'activa', tipo: 'carrera' })
    await db1.atletas.add({ eventoId: 1, dorsal: '1', nombre: 'A', status: 'activo', distanciaId: '' })
    db1.close()

    const db2 = shippedSchema(name)
    opened.push(db2)
    expect(await db2.eventos.count()).toBe(1)
    const a = await db2.atletas.toCollection().first()
    expect(a.nombre).toBe('A')
  })
})
