import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Dexie from 'dexie'
import { db } from '../../src/db'
import Resultados from '../../src/pages/Resultados'

async function reset() {
  db.close()
  await Dexie.delete('cronometraje')
  await db.open()
}

beforeEach(reset)
afterEach(() => vi.restoreAllMocks())

async function seed() {
  await db.eventos.add({
    id: 1,
    nombre: 'Tri Test',
    fecha: '2026-10-04',
    lugar: 'CDMX',
    tipo: 'triatlón',
    estado: 'terminada',
    configuracion: { inicioTipo: 'unico', horaInicio: 1_000_000 },
    categorias: [
      { id: 'cat-M', nombre: 'M 30-34', olas: [] },
      { id: 'cat-F', nombre: 'F 30-34', olas: [] },
    ],
    distancias: [{ id: 'd-1', nombre: 'Sprint' }],
  })
  await db.atletas.bulkAdd([
    { id: 10, eventoId: 1, dorsal: '10', nombre: 'Ana', apellido: 'López', genero: 'F', categoriaId: 'cat-F', olaId: '', distanciaId: 'd-1', status: 'activo' },
    { id: 11, eventoId: 1, dorsal: '11', nombre: 'Beto', apellido: 'Cruz', genero: 'M', categoriaId: 'cat-M', olaId: '', distanciaId: 'd-1', status: 'activo' },
  ])
  await db.tiempos.bulkAdd([
    { eventoId: 1, atletaId: 10, dorsal: '10', horaLlegada: 2_800_000, tiempoNeto: 1_800_000, segmento: 'finish' },
    { eventoId: 1, atletaId: 11, dorsal: '11', horaLlegada: 2_500_000, tiempoNeto: 1_500_000, segmento: 'finish' },
  ])
}

// jsdom has no download support: capture the Blob handed to
// URL.createObjectURL and the file name of the clicked anchor.
function capturarDescarga() {
  const descarga = {}
  URL.createObjectURL = vi.fn(blob => { descarga.blob = blob; return 'blob:resultados' })
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    descarga.nombre = this.download
  })
  return descarga
}

describe('Resultados — exportar CSV', () => {
  it('downloads the rows on screen as a UTF-8 CSV file', async () => {
    await seed()
    const descarga = capturarDescarga()
    render(
      <MemoryRouter initialEntries={['/eventos/1/resultados']}>
        <Routes>
          <Route path="/eventos/:id/resultados" element={<Resultados />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(await screen.findByDisplayValue('Todas las categorías'), { target: { value: 'cat-F' } })
    fireEvent.click(screen.getByRole('button', { name: '📊 CSV' }))

    await waitFor(() => expect(descarga.blob).toBeDefined())
    expect(descarga.nombre).toBe('resultados_Tri_Test.csv')
    const bytes = await descarga.blob.arrayBuffer()
    expect(new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)).toBe(
      '﻿Lugar,Dorsal,Nombre,Género,Categoría,Ola,Distancia,Tiempo,Lugar cat.,Estado\r\n' +
      '2,10,Ana López,F,F 30-34,,Sprint,00:30:00,1,Activo',
    )
  })
})
