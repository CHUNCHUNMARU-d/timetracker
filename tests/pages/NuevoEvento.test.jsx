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

function irAPasoDistancias(container) {
  fireEvent.change(screen.getByPlaceholderText('Triatlón San Cristóbal 2026'), { target: { value: 'Tri Test' } })
  fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2026-10-04' } })
  fireEvent.change(screen.getByPlaceholderText('San Cristóbal'), { target: { value: 'CDMX' } })
  fireEvent.click(screen.getByText('Siguiente →'))
}

function irAPasoCategorias(container) {
  irAPasoDistancias(container)
  fireEvent.click(screen.getByText('Siguiente →'))
}

async function crearEvento() {
  fireEvent.click(screen.getByRole('button', { name: 'Crear evento ✓' }))
  await screen.findByText('detalle')
  const [evento] = await db.eventos.toArray()
  return evento
}

describe('NuevoEvento — edades de categoría', () => {
  it('a newly added category starts with empty ages and saves them as null', async () => {
    const { container } = renderWizard()
    irAPasoCategorias(container)

    fireEvent.click(screen.getByRole('button', { name: 'Agregar categoría' }))
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

describe('NuevoEvento — categorías más claras', () => {
  it('labels every field of a category', () => {
    const { container } = renderWizard()
    irAPasoCategorias(container)

    expect(screen.getAllByRole('textbox', { name: 'Nombre' })[0]).toHaveValue('M 30-34')
    expect(screen.getAllByRole('combobox', { name: 'Género' })[0]).toHaveDisplayValue('Masculino')
    expect(screen.getAllByRole('spinbutton', { name: 'Edad mín' })[0]).toHaveValue(30)
    expect(screen.getAllByRole('spinbutton', { name: 'Edad máx' })[0]).toHaveValue(34)
  })

  it('keeps Crear evento disabled while a category has no name', () => {
    const { container } = renderWizard()
    irAPasoCategorias(container)

    fireEvent.click(screen.getByRole('button', { name: 'Agregar categoría' }))
    expect(screen.getByRole('button', { name: 'Crear evento ✓' })).toBeDisabled()
  })
})

describe('NuevoEvento — tipo de inicio automático', () => {
  it('adding an ola switches the start type to Por olas and the event is saved that way', async () => {
    const { container } = renderWizard()
    irAPasoCategorias(container)
    expect(screen.getByRole('status')).toHaveTextContent('Salida única')

    fireEvent.click(screen.getAllByRole('button', { name: 'Agregar ola' })[0])
    expect(screen.getByRole('textbox', { name: 'Nombre de ola' })).toHaveValue('Ola 1')
    expect(screen.getByRole('status')).toHaveTextContent('Por olas')

    const evento = await crearEvento()
    expect(evento.configuracion.inicioTipo).toBe('olas')
  })

  it('removing the last ola switches back to Salida única', async () => {
    const { container } = renderWizard()
    irAPasoCategorias(container)

    fireEvent.click(screen.getAllByRole('button', { name: 'Agregar ola' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar ola' }))
    expect(screen.getByRole('status')).toHaveTextContent('Salida única')

    const evento = await crearEvento()
    expect(evento.configuracion.inicioTipo).toBe('unico')
  })
})

describe('NuevoEvento — distancias', () => {
  it('Agregar distancia adds an empty, labelled distance', () => {
    const { container } = renderWizard()
    irAPasoDistancias(container)

    fireEvent.click(screen.getByRole('button', { name: 'Agregar distancia' }))
    expect(screen.getByRole('textbox', { name: 'Distancia 3' })).toHaveValue('')
    expect(screen.getByText('Siguiente →')).toBeDisabled()
  })
})
