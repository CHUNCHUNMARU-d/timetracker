import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Dexie from 'dexie'
import { db } from '../../src/db'
import Pantalla from '../../src/pages/Pantalla'

async function reset() {
  db.close()
  await Dexie.delete('cronometraje')
  await db.open()
}

beforeEach(reset)

async function seed() {
  await db.eventos.add({
    id: 1,
    nombre: 'Tri Test',
    fecha: '2026-10-04',
    lugar: 'CDMX',
    tipo: 'triatlón',
    estado: 'activa',
    configuracion: { inicioTipo: 'unico', horaInicio: 1_000_000 },
    categorias: [{ id: 'cat-F', nombre: 'F 30-34', olas: [] }],
    distancias: [],
  })
  await db.atletas.add({ id: 10, eventoId: 1, dorsal: '10', nombre: 'Ana', apellido: 'López', categoriaId: 'cat-F', status: 'activo' })
  await db.tiempos.add({ eventoId: 1, atletaId: 10, dorsal: '10', horaLlegada: 2_800_000, tiempoNeto: 1_800_000, segmento: 'finish' })
}

function renderPantalla() {
  render(
    <MemoryRouter initialEntries={['/pantalla/1']}>
      <Routes>
        <Route path="/pantalla/:id" element={<Pantalla />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Pantalla', () => {
  it('shows the results of the event in the URL', async () => {
    await seed()
    renderPantalla()

    expect(await screen.findByText('Ana López')).toBeInTheDocument()
    expect(screen.getByText('00:30:00')).toBeInTheDocument()
  })

  it('updates when another tab records an arrival', async () => {
    await seed()
    renderPantalla()
    await screen.findByText('Ana López')

    await db.atletas.add({ id: 11, eventoId: 1, dorsal: '11', nombre: 'Eva', apellido: 'Ruiz', categoriaId: 'cat-F', status: 'activo' })
    await db.tiempos.add({ eventoId: 1, atletaId: 11, dorsal: '11', horaLlegada: 2_900_000, tiempoNeto: 1_900_000, segmento: 'finish' })
    await act(async () => {
      const bc = new BroadcastChannel('cronometraje-sync')
      bc.postMessage({ tipo: 'actualizacion', eventoId: 1 })
      bc.close()
    })

    expect(await screen.findByText('Eva Ruiz')).toBeInTheDocument()
  })
})
