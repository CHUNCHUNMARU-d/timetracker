import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import Dexie from 'dexie'
import { db } from '../../src/db'
import { registrarPaso } from '../../src/utils/registrarPaso'

async function resetDb() {
  db.close()
  await Dexie.delete('cronometraje')
  await db.open()
}

function makeEvento(overrides = {}) {
  return {
    id: 1,
    estado: 'activa',
    categorias: [
      { id: 'cat-A', nombre: 'Élite', olas: [{ id: 'ola-1', nombre: 'Ola 1', horaInicio: 1_000_000 }] },
      { id: 'cat-B', nombre: 'Sub-23', olas: [{ id: 'ola-2', nombre: 'Ola 2', horaInicio: 1_000_000 }] },
    ],
    configuracion: { inicioTipo: 'unico' },
    ...overrides,
  }
}

function makeAtleta(overrides = {}) {
  return { id: 100, eventoId: 1, dorsal: '42', nombre: 'Ana', apellido: 'Lopez', categoriaId: 'cat-A', olaId: 'ola-1', status: 'activo', ...overrides }
}

function baseArgs(overrides = {}) {
  return {
    eventoId: 1,
    dorsal: '42',
    evento: makeEvento(),
    atletas: [makeAtleta()],
    tiempos: [],
    horaInicioGlobal: 1_000_000,
    totalPausado: 0,
    pausadoEn: null,
    esOlas: false,
    ...overrides,
  }
}

let postSpy

// Filter to only our `actualizacion` messages — Dexie itself uses BroadcastChannel
// internally to coordinate writes across tabs, so the global spy catches its
// traffic too.
function actualizacionCalls() {
  return postSpy.mock.calls.filter(([msg]) => msg?.tipo === 'actualizacion')
}

beforeEach(async () => {
  await resetDb()
  postSpy = vi.spyOn(BroadcastChannel.prototype, 'postMessage').mockImplementation(() => {})
  vi.spyOn(Date, 'now').mockReturnValue(1_010_000) // 10s after start
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('registrarPaso — success path', () => {
  it('writes a finish row with tiempoNeto = now - horaInicioGlobal - totalPausado', async () => {
    const res = await registrarPaso(baseArgs({ totalPausado: 5_000 }))

    expect(res.ok).toBe(true)
    expect(res.registro).toMatchObject({
      eventoId: 1,
      atletaId: 100,
      dorsal: '42',
      horaLlegada: 1_010_000,
      tiempoNeto: 5_000, // 1_010_000 - 1_000_000 - 5_000
      segmento: 'finish',
      olaId: null,
      editado: false,
      notaEdicion: '',
    })
    expect(typeof res.registro.id).toBe('number')

    const stored = await db.tiempos.toArray()
    expect(stored).toHaveLength(1)
    expect(stored[0].dorsal).toBe('42')
  })

  it('emits exactly one actualizacion BroadcastChannel message on success', async () => {
    await registrarPaso(baseArgs())
    const calls = actualizacionCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toEqual({ tipo: 'actualizacion', eventoId: 1 })
  })

  it('returns the matched atleta when dorsal matches a registered athlete', async () => {
    const res = await registrarPaso(baseArgs())
    expect(res.atleta).toMatchObject({ id: 100, nombre: 'Ana', apellido: 'Lopez' })
  })

  it('writes with atletaId=null when dorsal does not match any athlete', async () => {
    const res = await registrarPaso(baseArgs({ dorsal: '999' }))
    expect(res.ok).toBe(true)
    expect(res.registro.atletaId).toBeNull()
    expect(res.atleta).toBeNull()
  })

  it('trims whitespace from dorsal before lookup and storage', async () => {
    const res = await registrarPaso(baseArgs({ dorsal: '  42  ' }))
    expect(res.ok).toBe(true)
    expect(res.registro.dorsal).toBe('42')
    expect(res.registro.atletaId).toBe(100)
  })

  it("in wave mode, uses the athlete's ola.horaInicio (not horaInicioGlobal) for tiempoNeto", async () => {
    // Ola horaInicio = 1_005_000 (5s later than global); Date.now mocked to 1_010_000 → net = 5_000
    const evento = makeEvento({
      configuracion: { inicioTipo: 'olas' },
      categorias: [
        { id: 'cat-A', nombre: 'Élite', olas: [{ id: 'ola-1', nombre: 'Ola 1', horaInicio: 1_005_000 }] },
      ],
    })
    const res = await registrarPaso(baseArgs({
      evento,
      atletas: [makeAtleta({ categoriaId: 'cat-A', olaId: 'ola-1' })],
      esOlas: true,
    }))
    expect(res.ok).toBe(true)
    expect(res.registro.tiempoNeto).toBe(5_000)
    expect(res.registro.olaId).toBe('ola-1')
  })
})

describe('registrarPaso — guard paths', () => {
  it('returns TERMINADA when evento.estado === "terminada"', async () => {
    const res = await registrarPaso(baseArgs({ evento: makeEvento({ estado: 'terminada' }) }))
    expect(res).toEqual({ ok: false, code: 'TERMINADA' })
    expect(postSpy).not.toHaveBeenCalled()
    expect(await db.tiempos.count()).toBe(0)
  })

  it('returns VACIO when dorsal is empty after trim', async () => {
    const res = await registrarPaso(baseArgs({ dorsal: '   ' }))
    expect(res).toEqual({ ok: false, code: 'VACIO' })
    expect(await db.tiempos.count()).toBe(0)
  })

  it('returns PAUSADA when pausadoEn is set', async () => {
    const res = await registrarPaso(baseArgs({ pausadoEn: 1_005_000 }))
    expect(res).toEqual({ ok: false, code: 'PAUSADA' })
    expect(await db.tiempos.count()).toBe(0)
  })

  it('returns NO_INICIADA when there is no start time (mass-start mode)', async () => {
    const res = await registrarPaso(baseArgs({ horaInicioGlobal: null }))
    expect(res).toEqual({ ok: false, code: 'NO_INICIADA' })
    expect(await db.tiempos.count()).toBe(0)
  })

  it('returns NO_INICIADA in wave mode when no ola has started yet', async () => {
    const evento = makeEvento({
      configuracion: { inicioTipo: 'olas' },
      categorias: [
        { id: 'cat-A', nombre: 'Élite', olas: [{ id: 'ola-1', nombre: 'Ola 1' /* no horaInicio */ }] },
      ],
    })
    const res = await registrarPaso(baseArgs({
      evento,
      esOlas: true,
      horaInicioGlobal: null,
    }))
    expect(res.ok).toBe(false)
    expect(res.code).toBe('NO_INICIADA')
  })

  it('returns DUPLICADO with matching atleta when dorsal already registered', async () => {
    const prior = { id: 999, eventoId: 1, atletaId: 100, dorsal: '42', horaLlegada: 1_001_000, tiempoNeto: 1_000, segmento: 'finish' }
    const res = await registrarPaso(baseArgs({ tiempos: [prior] }))
    expect(res.ok).toBe(false)
    expect(res.code).toBe('DUPLICADO')
    expect(res.atleta).toMatchObject({ id: 100, nombre: 'Ana' })
    expect(res.dorsal).toBe('42')
    expect(await db.tiempos.count()).toBe(0)
  })

  it('accepts athletes of any category in mass-start (esOlas=false) mode', async () => {
    const res = await registrarPaso(baseArgs({
      atletas: [makeAtleta({ categoriaId: 'cat-B' })],
      esOlas: false,
    }))
    expect(res.ok).toBe(true)
  })

  it("returns OLA_NO_INICIADA when the athlete's own ola has not started", async () => {
    // Ola 1 started (so the race is running) but the athlete belongs to Ola 2.
    const evento = makeEvento({
      configuracion: { inicioTipo: 'olas' },
      categorias: [
        { id: 'cat-A', nombre: 'Élite', olas: [{ id: 'ola-1', nombre: 'Ola 1', horaInicio: 1_000_000 }] },
        { id: 'cat-B', nombre: 'Sub-23', olas: [{ id: 'ola-2', nombre: 'Ola 2' /* not started */ }] },
      ],
    })
    const res = await registrarPaso(baseArgs({
      evento,
      atletas: [makeAtleta({ categoriaId: 'cat-B', olaId: 'ola-2' })],
      esOlas: true,
    }))
    expect(res).toEqual({ ok: false, code: 'OLA_NO_INICIADA', dorsal: '42', ola: 'Ola 2' })
    expect(await db.tiempos.count()).toBe(0)
  })

  it('does NOT emit actualizacion on any guard failure', async () => {
    await registrarPaso(baseArgs({ evento: makeEvento({ estado: 'terminada' }) }))
    await registrarPaso(baseArgs({ dorsal: '' }))
    await registrarPaso(baseArgs({ pausadoEn: 1_005_000 }))
    await registrarPaso(baseArgs({ horaInicioGlobal: null }))
    expect(actualizacionCalls()).toHaveLength(0)
  })
})

// Several olas on course at once: Ola 1 (cat A) started at 1_000_000 — the race
// start — Ola 1b (cat A) at 1_004_000 and Ola 2 (cat B) at 1_004_000.
// Date.now is 1_010_000.
describe('registrarPaso — olas', () => {
  const eventoOlas = makeEvento({
    configuracion: { inicioTipo: 'olas' },
    categorias: [
      { id: 'cat-A', nombre: 'Élite', olas: [
        { id: 'ola-1', nombre: 'Ola 1', horaInicio: 1_000_000 },
        { id: 'ola-1b', nombre: 'Ola 1b', horaInicio: 1_004_000 },
      ] },
      { id: 'cat-B', nombre: 'Sub-23', olas: [{ id: 'ola-2', nombre: 'Ola 2', horaInicio: 1_004_000 }] },
    ],
  })
  const args = overrides => baseArgs({ evento: eventoOlas, esOlas: true, ...overrides })

  it('times an athlete of a later ola of the same category from that ola', async () => {
    const res = await registrarPaso(args({ atletas: [makeAtleta({ categoriaId: 'cat-A', olaId: 'ola-1b' })] }))
    expect(res.registro).toMatchObject({ tiempoNeto: 6_000, olaId: 'ola-1b' })
  })

  it('times an athlete of another category from their own ola', async () => {
    const res = await registrarPaso(args({ atletas: [makeAtleta({ categoriaId: 'cat-B', olaId: 'ola-2' })] }))
    expect(res.ok).toBe(true)
    expect(res.registro).toMatchObject({ tiempoNeto: 6_000, olaId: 'ola-2' })
  })

  it('times an athlete without an ola from the only ola of their category', async () => {
    const res = await registrarPaso(args({ atletas: [makeAtleta({ categoriaId: 'cat-B', olaId: '' })] }))
    expect(res.registro).toMatchObject({ tiempoNeto: 6_000, olaId: 'ola-2' })
  })

  it('times an unregistered dorsal from the race start', async () => {
    const res = await registrarPaso(args({ dorsal: '999' }))
    expect(res.registro).toMatchObject({ atletaId: null, tiempoNeto: 10_000, olaId: null })
  })
})

describe('registrarPaso — Dexie write failure', () => {
  it('returns WRITE_FAILED with message when db.tiempos.add throws', async () => {
    const addSpy = vi.spyOn(db.tiempos, 'add').mockRejectedValueOnce(new Error('quota exceeded'))
    const res = await registrarPaso(baseArgs())
    expect(res.ok).toBe(false)
    expect(res.code).toBe('WRITE_FAILED')
    expect(res.message).toContain('quota exceeded')
    expect(actualizacionCalls()).toHaveLength(0)
    addSpy.mockRestore()
  })
})
