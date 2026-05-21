import { describe, it, expect, beforeEach } from 'vitest'
import Dexie from 'dexie'
import { db, getResultados } from '../src/db'

async function reset() {
  db.close()
  await Dexie.delete('cronometraje')
  await db.open()
}

const evento = {
  id: 1,
  nombre: 'Carrera Demo',
  fecha: '2026-05-21',
  lugar: 'CDMX',
  tipo: 'Triatlón',
  estado: 'activo',
  configuracion: { inicioTipo: 'unico' },
  categorias: [
    { id: 'cat-A', nombre: 'Élite M', olas: [{ id: 'ola-1', nombre: 'Ola 1' }] },
    { id: 'cat-B', nombre: 'Sub-23 F', olas: [{ id: 'ola-1', nombre: 'Ola 1' }] },
  ],
  distancias: [{ id: 'd-olym', nombre: 'Olímpica' }],
}

beforeEach(async () => {
  await reset()
  await db.eventos.add(evento)
})

describe('getResultados', () => {
  it('returns empty when evento missing', async () => {
    const r = await getResultados(999)
    expect(r).toEqual({ evento: null, filas: [] })
  })

  it('ranks finishers by tiempoNeto ascending and assigns lugarGeneral', async () => {
    await db.atletas.bulkAdd([
      { id: 10, eventoId: 1, dorsal: '1', nombre: 'A', categoriaId: 'cat-A', olaId: 'ola-1', status: 'activo' },
      { id: 11, eventoId: 1, dorsal: '2', nombre: 'B', categoriaId: 'cat-A', olaId: 'ola-1', status: 'activo' },
      { id: 12, eventoId: 1, dorsal: '3', nombre: 'C', categoriaId: 'cat-B', olaId: 'ola-1', status: 'activo' },
    ])
    await db.tiempos.bulkAdd([
      { eventoId: 1, atletaId: 10, dorsal: '1', tiempoNeto: 3000, horaLlegada: 100, segmento: 'finish' },
      { eventoId: 1, atletaId: 11, dorsal: '2', tiempoNeto: 1000, horaLlegada: 100, segmento: 'finish' },
      { eventoId: 1, atletaId: 12, dorsal: '3', tiempoNeto: 2000, horaLlegada: 100, segmento: 'finish' },
    ])
    const { filas } = await getResultados(1)
    expect(filas.map(f => f.dorsal)).toEqual(['2', '3', '1'])
    expect(filas.map(f => f.lugarGeneral)).toEqual([1, 2, 3])
  })

  it('keeps the latest finish per atleta when duplicates exist', async () => {
    await db.atletas.add({ id: 20, eventoId: 1, dorsal: '9', nombre: 'D', categoriaId: 'cat-A', olaId: 'ola-1', status: 'activo' })
    await db.tiempos.bulkAdd([
      { eventoId: 1, atletaId: 20, dorsal: '9', tiempoNeto: 5000, horaLlegada: 100, segmento: 'finish' },
      { eventoId: 1, atletaId: 20, dorsal: '9', tiempoNeto: 4000, horaLlegada: 200, segmento: 'finish' }, // later
    ])
    const { filas } = await getResultados(1)
    expect(filas).toHaveLength(1)
    expect(filas[0].tiempoNeto).toBe(4000)
  })

  it('numbers category rank separately from general rank', async () => {
    await db.atletas.bulkAdd([
      { id: 30, eventoId: 1, dorsal: '1', categoriaId: 'cat-A', olaId: 'ola-1', status: 'activo' },
      { id: 31, eventoId: 1, dorsal: '2', categoriaId: 'cat-A', olaId: 'ola-1', status: 'activo' },
      { id: 32, eventoId: 1, dorsal: '3', categoriaId: 'cat-B', olaId: 'ola-1', status: 'activo' },
    ])
    await db.tiempos.bulkAdd([
      { eventoId: 1, atletaId: 30, dorsal: '1', tiempoNeto: 1000, horaLlegada: 1, segmento: 'finish' },
      { eventoId: 1, atletaId: 31, dorsal: '2', tiempoNeto: 2000, horaLlegada: 2, segmento: 'finish' },
      { eventoId: 1, atletaId: 32, dorsal: '3', tiempoNeto: 1500, horaLlegada: 3, segmento: 'finish' },
    ])
    const { filas } = await getResultados(1)
    const byDorsal = Object.fromEntries(filas.map(f => [f.dorsal, f]))
    expect(byDorsal['1'].lugarCategoria).toBe(1)
    expect(byDorsal['2'].lugarCategoria).toBe(2)
    expect(byDorsal['3'].lugarCategoria).toBe(1) // first in cat-B
  })

  it('appends dns/dnf/dsq athletes after finishers with null ranks', async () => {
    await db.atletas.bulkAdd([
      { id: 40, eventoId: 1, dorsal: '1', categoriaId: 'cat-A', olaId: 'ola-1', status: 'activo' },
      { id: 41, eventoId: 1, dorsal: '2', categoriaId: 'cat-A', olaId: 'ola-1', status: 'dnf' },
      { id: 42, eventoId: 1, dorsal: '3', categoriaId: 'cat-A', olaId: 'ola-1', status: 'dns' },
    ])
    await db.tiempos.add({ eventoId: 1, atletaId: 40, dorsal: '1', tiempoNeto: 1000, horaLlegada: 1, segmento: 'finish' })
    const { filas } = await getResultados(1)
    expect(filas).toHaveLength(3)
    expect(filas[0].status).toBe('activo')
    expect(filas[0].lugarGeneral).toBe(1)
    expect(filas[1].lugarGeneral).toBeNull()
    expect(filas[2].lugarGeneral).toBeNull()
  })

  it('captures splits when present', async () => {
    await db.atletas.add({ id: 50, eventoId: 1, dorsal: '7', categoriaId: 'cat-A', olaId: 'ola-1', status: 'activo' })
    await db.tiempos.bulkAdd([
      { eventoId: 1, atletaId: 50, dorsal: '7', tiempoNeto: 900, horaLlegada: 1, segmento: 'swim' },
      { eventoId: 1, atletaId: 50, dorsal: '7', tiempoNeto: 2500, horaLlegada: 2, segmento: 'bike' },
      { eventoId: 1, atletaId: 50, dorsal: '7', tiempoNeto: 4000, horaLlegada: 3, segmento: 'finish' },
    ])
    const { filas } = await getResultados(1)
    expect(filas[0].tieneSplits).toBe(true)
    expect(filas[0].splits.swim).toBe(900)
    expect(filas[0].splits.bike).toBe(2500)
  })
})
