import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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

function seedEvent({ inicioTipo = 'unico', estado = 'preparacion', distancias = [{ id: 'd-1', nombre: 'Sprint' }] } = {}) {
  return db.eventos.add({
    id: 1,
    nombre: 'Tri Test',
    fecha: '2026-10-04',
    lugar: 'CDMX',
    tipo: 'triatlón',
    estado,
    configuracion: { inicioTipo, horaInicio: null },
    categorias: [{ id: 'cat-A', nombre: 'M 30-34', genero: 'M', edadMin: 30, edadMax: 34, olas: [] }],
    distancias,
  })
}

function renderDetalle() {
  render(
    <MemoryRouter initialEntries={['/eventos/1']}>
      <Routes>
        <Route path="/eventos/:id" element={<DetalleEvento />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function abrirConfiguracion() {
  renderDetalle()
  fireEvent.click(await screen.findByText('Configuración'))
}

// Clicks Guardar cambios and waits until the page shows it saved (the button
// reads "Guardando…" meanwhile).
async function guardarCambios() {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await screen.findByRole('button', { name: 'Guardar cambios' })
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

    fireEvent.click(screen.getByRole('button', { name: 'Agregar categoría' }))
    const edades = screen.getAllByRole('spinbutton')
    expect(edades).toHaveLength(4)
    expect(edades[2].value).toBe('')
    expect(edades[3].value).toBe('')
  })
})

describe('DetalleEvento — tipo de inicio automático', () => {
  it('saving Configuración stores the start type the olas imply', async () => {
    // Stored "olas" with no olas at all: the old trap that left Timing without a start button.
    await seedEvent({ inicioTipo: 'olas' })
    await abrirConfiguracion()
    expect(screen.getByRole('status')).toHaveTextContent('Salida única')

    await guardarCambios()
    expect((await db.eventos.get(1)).configuracion.inicioTipo).toBe('unico')

    fireEvent.click(screen.getByRole('button', { name: 'Agregar ola' }))
    expect(screen.getByRole('status')).toHaveTextContent('Por olas')
    await guardarCambios()
    expect((await db.eventos.get(1)).configuracion.inicioTipo).toBe('olas')
  })
})

describe('DetalleEvento — distancias en Configuración', () => {
  it('renames and adds distances, saved with Guardar cambios', async () => {
    await seedEvent()
    await abrirConfiguracion()

    fireEvent.change(screen.getByRole('textbox', { name: 'Distancia 1' }), { target: { value: 'Sprint 750 m' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar distancia' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Distancia 2' }), { target: { value: 'Olímpico' } })
    await guardarCambios()

    const ev = await db.eventos.get(1)
    expect(ev.distancias.map(d => d.nombre)).toEqual(['Sprint 750 m', 'Olímpico'])
  })

  it('does not let a distance that athletes run be removed', async () => {
    await seedEvent({ distancias: [{ id: 'd-1', nombre: 'Sprint' }, { id: 'd-2', nombre: 'Olímpico' }] })
    await db.atletas.add({ eventoId: 1, dorsal: '7', nombre: 'Ana', apellido: 'López', distanciaId: 'd-1', status: 'activo' })
    await abrirConfiguracion()

    const [sprint, olimpico] = screen.getAllByRole('button', { name: 'Eliminar distancia' })
    expect(sprint).toBeDisabled()
    expect(olimpico).toBeEnabled()
  })

  it('locks distances once the race is active', async () => {
    await seedEvent({ estado: 'activa' })
    await abrirConfiguracion()

    expect(screen.getByRole('textbox', { name: 'Distancia 1' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Agregar distancia' })).toBeNull()
  })
})

describe('DetalleEvento — distancia de cada atleta', () => {
  it("shows each athlete's distance in the table", async () => {
    await seedEvent()
    await db.atletas.add({ eventoId: 1, dorsal: '7', nombre: 'Ana', apellido: 'López', distanciaId: 'd-1', status: 'activo' })
    renderDetalle()

    const fila = await screen.findByRole('row', { name: /Ana López/ })
    expect(within(fila).getByText('Sprint')).toBeInTheDocument()
  })

  it('offers the event distances in the athlete form', async () => {
    await seedEvent()
    renderDetalle()

    fireEvent.click(await screen.findByText('+ Atleta'))
    expect(screen.getByRole('combobox', { name: 'Distancia *' })).toHaveDisplayValue('Sprint')
  })
})

describe('DetalleEvento — accesos', () => {
  it('opens the Pantalla in a new tab', async () => {
    await seedEvent()
    renderDetalle()

    const pantalla = await screen.findByRole('link', { name: /Abrir Pantalla/ })
    expect(pantalla).toHaveAttribute('href', '/pantalla/1')
    expect(pantalla).toHaveAttribute('target', '_blank')
  })
})
