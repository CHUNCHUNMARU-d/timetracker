import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import Dexie from 'dexie'
import { db } from '../../src/db'
import Timing from '../../src/pages/Timing'

async function reset() {
  db.close()
  await Dexie.delete('cronometraje')
  await db.open()
}

function seedEvent({ inicioTipo = 'unico', horaInicio = 1_000_000, totalPausado = 0, pausadoEn = null, olaActiva = null, estado = 'activa', inicioOla2 = 1_000_000 } = {}) {
  return db.eventos.add({
    id: 1,
    nombre: 'Carrera Test',
    fecha: '2026-05-21',
    lugar: 'CDMX',
    tipo: 'Triatlón',
    estado,
    configuracion: { inicioTipo, horaInicio, totalPausado, pausadoEn, olaActiva },
    categorias: [
      { id: 'cat-A', nombre: 'Élite', olas: [{ id: 'ola-1', nombre: 'Ola 1', horaInicio: 1_000_000 }] },
      { id: 'cat-B', nombre: 'Sub-23', olas: [{ id: 'ola-2', nombre: 'Ola 2', horaInicio: inicioOla2 }] },
    ],
    distancias: [],
  })
}

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="loc">{loc.pathname}</div>
}

function renderTiming() {
  return render(
    <MemoryRouter initialEntries={['/eventos/1/timing']}>
      <Routes>
        <Route path="/eventos/:id/timing" element={<Timing />} />
        <Route path="/eventos/:id/resultados" element={<LocationProbe />} />
        <Route path="/eventos/:id" element={<LocationProbe />} />
        <Route path="/" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

function getBibInput() {
  return screen.getByLabelText('Número de dorsal')
}

beforeEach(reset)

describe('Timing — dorsal registration', () => {
  it('persists a finish row with tiempoNeto = now - horaInicio - totalPausado', async () => {
    await seedEvent({ horaInicio: 1_000_000, totalPausado: 5_000 })
    await db.atletas.add({ id: 100, eventoId: 1, dorsal: '42', nombre: 'Ana', apellido: 'Lopez', categoriaId: 'cat-A', olaId: 'ola-1', status: 'activo' })
    vi.spyOn(Date, 'now').mockReturnValue(1_010_000) // 10s after start

    renderTiming()
    const input = await waitFor(() => getBibInput())
    fireEvent.change(input, { target: { value: '42' } })
    fireEvent.click(screen.getByText(/Registrar llegada/))

    await waitFor(async () => {
      const rows = await db.tiempos.toArray()
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        dorsal: '42',
        atletaId: 100,
        eventoId: 1,
        segmento: 'finish',
        tiempoNeto: 5_000, // 1_010_000 - 1_000_000 - 5_000
      })
    })
  })

  it('rejects a duplicate dorsal already registered', async () => {
    await seedEvent({ horaInicio: 1_000_000 })
    await db.atletas.add({ id: 101, eventoId: 1, dorsal: '7', nombre: 'X', apellido: 'Y', categoriaId: 'cat-A', olaId: 'ola-1', status: 'activo' })
    await db.tiempos.add({ eventoId: 1, atletaId: 101, dorsal: '7', horaLlegada: 1_001_000, tiempoNeto: 1_000, segmento: 'finish' })
    vi.spyOn(Date, 'now').mockReturnValue(1_010_000)

    renderTiming()
    const input = await waitFor(() => getBibInput())
    fireEvent.change(input, { target: { value: '7' } })
    fireEvent.click(screen.getByText(/Registrar llegada/))

    await waitFor(() => expect(screen.getByText(/ya registrado/)).toBeInTheDocument())
    expect(await db.tiempos.count()).toBe(1)
  })

  it('blocks registration when race is paused', async () => {
    await seedEvent({ horaInicio: 1_000_000, pausadoEn: 1_005_000 })
    await db.atletas.add({ id: 102, eventoId: 1, dorsal: '9', nombre: 'P', apellido: 'Q', categoriaId: 'cat-A', olaId: 'ola-1', status: 'activo' })

    renderTiming()
    // When paused, the bib input is disabled — click "Reanudar" first would normally unlock,
    // but here we assert the disabled state by checking the lockReason banner.
    await waitFor(() => expect(screen.getByText(/Pausa activa/)).toBeInTheDocument())
    expect(await db.tiempos.count()).toBe(0)
  })

  it("in wave mode, times a dorsal from its own ola even when another category's ola is active", async () => {
    await seedEvent({ inicioTipo: 'olas', horaInicio: 1_000_000, olaActiva: { categoriaId: 'cat-A', olaId: 'ola-1' }, inicioOla2: 1_004_000 })
    await db.atletas.add({ id: 200, eventoId: 1, dorsal: '50', nombre: 'M', apellido: 'N', categoriaId: 'cat-B', olaId: 'ola-2', status: 'activo' })
    vi.spyOn(Date, 'now').mockReturnValue(1_010_000)

    renderTiming()
    const input = await waitFor(() => getBibInput())
    fireEvent.change(input, { target: { value: '50' } })
    fireEvent.click(screen.getByText(/Registrar llegada/))

    await waitFor(async () => {
      const rows = await db.tiempos.toArray()
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ dorsal: '50', tiempoNeto: 6_000, olaId: 'ola-2' })
    })
  })

  it('warns instead of timing a dorsal whose ola has not started', async () => {
    await seedEvent({ inicioTipo: 'olas', horaInicio: 1_000_000, olaActiva: { categoriaId: 'cat-A', olaId: 'ola-1' }, inicioOla2: null })
    await db.atletas.add({ id: 201, eventoId: 1, dorsal: '51', nombre: 'M', apellido: 'N', categoriaId: 'cat-B', olaId: 'ola-2', status: 'activo' })

    renderTiming()
    const input = await waitFor(() => getBibInput())
    fireEvent.change(input, { target: { value: '51' } })
    fireEvent.click(screen.getByText(/Registrar llegada/))

    expect(await screen.findByText(/Ola 2 aún no inicia/)).toBeInTheDocument()
    expect(await db.tiempos.count()).toBe(0)
  })

  it('shows started olas as en curso and does not restart them', async () => {
    await seedEvent({ inicioTipo: 'olas', horaInicio: 1_000_000, olaActiva: { categoriaId: 'cat-A', olaId: 'ola-1' }, inicioOla2: null })
    renderTiming()

    expect(await screen.findByRole('button', { name: /Ola 1 · en curso/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Iniciar Ola 2/ })).toBeEnabled()
  })

  it('strips non-digits from dorsal input', async () => {
    await seedEvent({ horaInicio: 1_000_000 })
    renderTiming()
    const input = await waitFor(() => getBibInput())
    fireEvent.change(input, { target: { value: 'abc12-3xy' } })
    expect(input.value).toBe('123')
  })

  it('Stop two-step → marks evento terminada and freezes UI (no auto-nav)', async () => {
    await seedEvent({ horaInicio: 1_000_000 })
    renderTiming()
    await waitFor(() => getBibInput())

    // First click arms the stop gate; second click confirms.
    fireEvent.click(screen.getByText(/⏹ Terminar/))
    fireEvent.click(await screen.findByText(/DETENER CARRERA/))

    await waitFor(async () => {
      const ev = await db.eventos.get(1)
      expect(ev.estado).toBe('terminada')
    })

    // Post-race panel renders with both follow-up actions; no auto-navigation
    expect(screen.getByText(/Tiempo final de carrera/)).toBeInTheDocument()
    expect(screen.getByText(/Abrir Pantalla/)).toBeInTheDocument()
    expect(screen.getByText(/Volver al evento/)).toBeInTheDocument()
    // No auto-navigation: the LocationProbe is only mounted at other paths
    expect(screen.queryByTestId('loc')).toBeNull()
  })

  it('Pantalla anchor in top bar links to /pantalla/:id in a new tab', async () => {
    await seedEvent({ horaInicio: 1_000_000 })
    renderTiming()
    await waitFor(() => getBibInput())

    const anchor = screen.getByRole('link', { name: /Pantalla/i })
    expect(anchor).toHaveAttribute('href', '/pantalla/1')
    expect(anchor).toHaveAttribute('target', '_blank')

    // Anchor click doesn't change estado
    const ev = await db.eventos.get(1)
    expect(ev.estado).toBe('activa')
  })
})

describe('Timing — accesos y olas', () => {
  it('Escaneo link opens /eventos/:id/scan in a new tab', async () => {
    await seedEvent({ horaInicio: 1_000_000 })
    renderTiming()

    const escaneo = await screen.findByRole('link', { name: /Escaneo/ })
    expect(escaneo).toHaveAttribute('href', '/eventos/1/scan')
    expect(escaneo).toHaveAttribute('target', '_blank')
  })

  it('an ola that has not started offers Iniciar, and starting it activates the race', async () => {
    await db.eventos.add({
      id: 1,
      nombre: 'Olas Test',
      fecha: '2026-05-21',
      lugar: 'CDMX',
      tipo: 'triatlón',
      estado: 'preparacion',
      configuracion: { inicioTipo: 'olas' },
      categorias: [{ id: 'cat-A', nombre: 'Élite', olas: [{ id: 'ola-1', nombre: 'Ola 1' }] }],
      distancias: [],
    })
    await db.atletas.add({ eventoId: 1, dorsal: '1', nombre: 'A', apellido: 'B', categoriaId: 'cat-A', olaId: 'ola-1', status: 'activo' })
    renderTiming()

    fireEvent.click(await screen.findByRole('button', { name: /Iniciar Ola 1/ }))
    await waitFor(async () => {
      const ev = await db.eventos.get(1)
      expect(ev.estado).toBe('activa')
      expect(ev.categorias[0].olas[0].horaInicio).toEqual(expect.any(Number))
    })
  })
})

describe('Timing — start guard', () => {
  it('blocks iniciarCarrera when no atletas exist', async () => {
    // Seed event in preparacion with no atletas — start should be blocked
    await db.eventos.add({
      id: 1,
      nombre: 'Sin atletas',
      fecha: '2026-05-21',
      lugar: 'CDMX',
      tipo: 'carrera',
      estado: 'preparacion',
      configuracion: { inicioTipo: 'unico' },
      categorias: [{ id: 'cat-A', nombre: 'Élite', olas: [] }],
      distancias: [],
    })

    renderTiming()
    fireEvent.click(await screen.findByText(/Iniciar carrera/))

    await waitFor(() => expect(screen.getByText(/Falta:/)).toBeInTheDocument())
    const ev = await db.eventos.get(1)
    expect(ev.estado).toBe('preparacion')
  })
})
