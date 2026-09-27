import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Dexie from 'dexie'
import { db } from '../../src/db'
import NuevoEvento from '../../src/pages/NuevoEvento'

async function reset() {
  db.close()
  await Dexie.delete('cronometraje')
  await db.open()
}

beforeEach(reset)

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={['/eventos/nuevo']}>
      <Routes>
        <Route path="/eventos/nuevo" element={<NuevoEvento />} />
        <Route path="/eventos/:id" element={<div>detalle</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function irAPasoCategorias(container) {
  fireEvent.change(screen.getByPlaceholderText('Triatlón San Cristóbal 2026'), { target: { value: 'Tri Test' } })
  fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2026-10-04' } })
  fireEvent.change(screen.getByPlaceholderText('San Cristóbal'), { target: { value: 'CDMX' } })
  fireEvent.click(screen.getByText('Siguiente →'))
  fireEvent.click(screen.getByText('Siguiente →'))
}

async function crearEvento() {
  fireEvent.click(screen.getByText('Siguiente →'))
  fireEvent.click(screen.getByText('Crear evento ✓'))
  await screen.findByText('detalle')
  const [evento] = await db.eventos.toArray()
  return evento
}

describe('NuevoEvento — edades de categoría', () => {
  it('a newly added category starts with empty ages and saves them as null', async () => {
    const { container } = renderWizard()
    irAPasoCategorias(container)

    fireEvent.click(screen.getByText('+ Categoría'))
    const edades = screen.getAllByRole('spinbutton')
    expect(edades).toHaveLength(6) // 2 default categories + the new one, min & max each
    expect(edades[4].value).toBe('')
    expect(edades[5].value).toBe('')

    const nombres = screen.getAllByPlaceholderText('M 30-34')
    fireEvent.change(nombres[2], { target: { value: 'Libre' } })

    const evento = await crearEvento()
    expect(evento.categorias[2]).toMatchObject({ nombre: 'Libre', edadMin: null, edadMax: null })
  })

  it('clearing an age leaves the box empty and saves null', async () => {
    const { container } = renderWizard()
    irAPasoCategorias(container)

    const [edadMin] = screen.getAllByRole('spinbutton')
    fireEvent.change(edadMin, { target: { value: '' } })
    expect(edadMin.value).toBe('')

    const evento = await crearEvento()
    expect(evento.categorias[0]).toMatchObject({ edadMin: null, edadMax: 34 })
  })
})
