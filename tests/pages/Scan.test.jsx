import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Dexie from 'dexie'
import { db } from '../../src/db'
import Scan from '../../src/pages/Scan'

async function reset() {
  db.close()
  await Dexie.delete('cronometraje')
  await db.open()
}

function seedEvent({ estado = 'activa', horaInicio = 1_000_000, totalPausado = 0, pausadoEn = null, inicioTipo = 'unico', olaActiva = null } = {}) {
  return db.eventos.add({
    id: 1,
    nombre: 'Carrera Test',
    fecha: '2026-05-21',
    lugar: 'CDMX',
    tipo: 'Triatlón',
    estado,
    configuracion: { inicioTipo, horaInicio, totalPausado, pausadoEn, olaActiva },
    categorias: [
      { id: 'cat-A', nombre: 'Élite', olas: [{ id: 'ola-1', nombre: 'Ola 1', horaInicio }] },
    ],
    distancias: [],
  })
}

function renderScan() {
  return render(
    <MemoryRouter initialEntries={['/eventos/1/scan']}>
      <Routes>
        <Route path="/eventos/:id/scan" element={<Scan />} />
      </Routes>
    </MemoryRouter>,
  )
}

function getBibInput() {
  return screen.getByLabelText('Número de dorsal')
}

beforeEach(reset)

describe('Scan — phase guards', () => {
  it('shows a blocking banner when the race is in preparacion', async () => {
    await seedEvent({ estado: 'preparacion', horaInicio: null })
    renderScan()
    await waitFor(() => expect(screen.getByText(/Inicia la carrera/i)).toBeInTheDocument())
    expect(screen.queryByLabelText('Número de dorsal')).not.toBeInTheDocument()
  })

  it('shows a blocking banner when the race is terminada', async () => {
    await seedEvent({ estado: 'terminada' })
    renderScan()
    await waitFor(() => expect(screen.getByText(/Carrera terminada/i)).toBeInTheDocument())
    expect(screen.queryByLabelText('Número de dorsal')).not.toBeInTheDocument()
  })

  it('shows a blocking banner when the race is paused', async () => {
    await seedEvent({ estado: 'activa', pausadoEn: 1_005_000 })
    renderScan()
    await waitFor(() => expect(screen.getByText(/Carrera en pausa/i)).toBeInTheDocument())
    expect(screen.queryByLabelText('Número de dorsal')).not.toBeInTheDocument()
  })
})

describe('Scan — successful scan', () => {
  it('writes a finish row and shows the dorsal in the recent-scans list', async () => {
    await seedEvent({ horaInicio: 1_000_000, totalPausado: 0 })
    await db.atletas.add({ id: 100, eventoId: 1, dorsal: '42', nombre: 'Ana', apellido: 'Lopez', categoriaId: 'cat-A', olaId: 'ola-1', status: 'activo' })
    vi.spyOn(Date, 'now').mockReturnValue(1_010_000)

    renderScan()
    const input = await waitFor(() => getBibInput())
    fireEvent.change(input, { target: { value: '42' } })
    fireEvent.click(screen.getByText(/Registrar llegada/))

    await waitFor(async () => {
      const rows = await db.tiempos.toArray()
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ dorsal: '42', atletaId: 100, tiempoNeto: 10_000 })
    })

    // The dorsal + athlete name appear in the in-memory recent-scans list
    const list = screen.getByTestId('recent-scans')
    expect(list).toHaveTextContent('42')
    expect(list).toHaveTextContent('Ana')
  })

  it('refocuses the input after a successful scan', async () => {
    await seedEvent({ horaInicio: 1_000_000 })
    await db.atletas.add({ id: 100, eventoId: 1, dorsal: '42', nombre: 'Ana', apellido: 'Lopez', categoriaId: 'cat-A', olaId: 'ola-1', status: 'activo' })
    vi.spyOn(Date, 'now').mockReturnValue(1_010_000)

    renderScan()
    const input = await waitFor(() => getBibInput())
    fireEvent.change(input, { target: { value: '42' } })
    fireEvent.click(screen.getByText(/Registrar llegada/))

    await waitFor(() => expect(document.activeElement).toBe(input))
  })

  it('shows an error flash when the dorsal is already registered', async () => {
    await seedEvent({ horaInicio: 1_000_000 })
    await db.atletas.add({ id: 100, eventoId: 1, dorsal: '42', nombre: 'Ana', apellido: 'Lopez', categoriaId: 'cat-A', olaId: 'ola-1', status: 'activo' })
    await db.tiempos.add({ eventoId: 1, atletaId: 100, dorsal: '42', horaLlegada: 1_001_000, tiempoNeto: 1_000, segmento: 'finish' })
    vi.spyOn(Date, 'now').mockReturnValue(1_010_000)

    renderScan()
    const input = await waitFor(() => getBibInput())
    fireEvent.change(input, { target: { value: '42' } })
    fireEvent.click(screen.getByText(/Registrar llegada/))

    await waitFor(() => expect(screen.getByText(/ya registrado/i)).toBeInTheDocument())
    expect(await db.tiempos.count()).toBe(1)
  })
})

describe('Scan — cross-tab refresh', () => {
  it('switches to a blocking banner when another tab pauses the race', async () => {
    await seedEvent({ estado: 'activa', horaInicio: 1_000_000 })
    renderScan()
    await waitFor(() => getBibInput()) // active, input shown

    // Simulate another tab pausing: update db, then emit on the same channel.
    await db.eventos.update(1, { configuracion: { inicioTipo: 'unico', horaInicio: 1_000_000, pausadoEn: 1_005_000, totalPausado: 0, olaActiva: null } })
    await act(async () => {
      const bc = new BroadcastChannel('cronometraje-sync')
      bc.postMessage({ tipo: 'actualizacion', eventoId: 1 })
      bc.close()
      // Let the listener's async re-fetch settle
      await new Promise(r => setTimeout(r, 30))
    })

    await waitFor(() => expect(screen.getByText(/Carrera en pausa/i)).toBeInTheDocument())
  })
})
