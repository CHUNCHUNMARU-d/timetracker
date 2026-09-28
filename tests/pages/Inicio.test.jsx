import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dexie from 'dexie'
import { db } from '../../src/db'
import Inicio from '../../src/pages/Inicio'

async function reset() {
  db.close()
  await Dexie.delete('cronometraje')
  await db.open()
}

beforeEach(reset)

describe('Inicio — accesos', () => {
  it('opens each event Pantalla in a new tab', async () => {
    await db.eventos.add({ id: 3, nombre: 'Tri Test', fecha: '2026-10-04', lugar: 'CDMX', tipo: 'triatlón', estado: 'preparacion' })
    render(<MemoryRouter><Inicio /></MemoryRouter>)

    const pantalla = await screen.findByRole('link', { name: /Pantalla/ })
    expect(pantalla).toHaveAttribute('href', '/pantalla/3')
    expect(pantalla).toHaveAttribute('target', '_blank')
  })
})
