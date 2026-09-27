import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Dexie from 'dexie'
import { db } from '../../src/db'
import DetalleEvento from '../../src/pages/DetalleEvento'

async function reset() {
  db.close()
  await Dexie.delete('cronometraje')
  await db.open()
}

beforeEach(reset)

function seedEvent() {
  return db.eventos.add({
    id: 1,
    nombre: 'Tri Test',
    fecha: '2026-10-04',
    lugar: 'CDMX',
    tipo: 'triatlón',
    estado: 'preparacion',
    configuracion: { inicioTipo: 'unico', horaInicio: null },
    categorias: [{ id: 'cat-A', nombre: 'M 30-34', genero: 'M', edadMin: 30, edadMax: 34, olas: [] }],
    distancias: [{ id: 'd-1', nombre: 'Sprint' }],
  })
}

async function abrirConfiguracion() {
  render(
    <MemoryRouter initialEntries={['/eventos/1']}>
      <Routes>
        <Route path="/eventos/:id" element={<DetalleEvento />} />
      </Routes>
    </MemoryRouter>,
  )
  fireEvent.click(await screen.findByText('Configuración'))
}

describe('DetalleEvento — edades de categoría', () => {
  it('clearing an age leaves the box empty and saves null', async () => {
    await seedEvent()
    await abrirConfiguracion()

    const [edadMin] = screen.getAllByRole('spinbutton')
    fireEvent.change(edadMin, { target: { value: '' } })
    expect(edadMin.value).toBe('')

    fireEvent.click(screen.getByText('Guardar cambios'))
    await waitFor(async () => {
      const ev = await db.eventos.get(1)
      expect(ev.categorias[0]).toMatchObject({ edadMin: null, edadMax: 34 })
    })
  })

  it('a newly added category starts with empty ages', async () => {
    await seedEvent()
    await abrirConfiguracion()

    fireEvent.click(screen.getByText('+ Categoría'))
    const edades = screen.getAllByRole('spinbutton')
    expect(edades).toHaveLength(4)
    expect(edades[2].value).toBe('')
    expect(edades[3].value).toBe('')
  })
})
