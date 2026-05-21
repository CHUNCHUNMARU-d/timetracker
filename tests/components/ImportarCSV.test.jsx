import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Dexie from 'dexie'
import { db } from '../../src/db'
import ImportarCSV from '../../src/components/ImportarCSV'

async function reset() {
  db.close()
  await Dexie.delete('cronometraje')
  await db.open()
}

const categorias = [
  { id: 'cat-A', nombre: 'Élite M', olas: [{ id: 'ola-1', nombre: 'Ola 1' }] },
]

beforeEach(reset)

function dropCsv(text) {
  const file = new File([text], 'atletas.csv', { type: 'text/csv' })
  const input = document.querySelector('input[type="file"]')
  fireEvent.change(input, { target: { files: [file] } })
}

describe('ImportarCSV', () => {
  it('renders dropzone with column hint', () => {
    render(<ImportarCSV eventoId={1} categorias={categorias} onImportado={() => {}} />)
    expect(screen.getByText(/Arrastra un CSV/)).toBeInTheDocument()
    expect(screen.getByText(/dorsal, nombre, apellido/)).toBeInTheDocument()
  })

  it('flags duplicate dorsales already in DB', async () => {
    await db.atletas.add({ eventoId: 1, dorsal: '101', nombre: 'Existente', status: 'activo' })
    render(<ImportarCSV eventoId={1} categorias={categorias} onImportado={() => {}} />)
    dropCsv('dorsal,nombre,apellido\n101,Ana,Lopez\n102,Beto,Cruz\n')
    await waitFor(() => expect(screen.getByText(/Vista previa/)).toBeInTheDocument())
    expect(screen.getByText(/1 fila con dorsal duplicado/)).toBeInTheDocument()
  })

  it('flags duplicate dorsales within the CSV itself', async () => {
    render(<ImportarCSV eventoId={1} categorias={categorias} onImportado={() => {}} />)
    dropCsv('dorsal,nombre\n5,X\n5,Y\n')
    await waitFor(() => expect(screen.getByText(/Vista previa/)).toBeInTheDocument())
    expect(screen.getByText(/1 fila con dorsal duplicado/)).toBeInTheDocument()
  })

  it('shows error for empty CSV', async () => {
    render(<ImportarCSV eventoId={1} categorias={categorias} onImportado={() => {}} />)
    dropCsv('dorsal,nombre\n')
    await waitFor(() => expect(screen.getByText(/El archivo está vacío/)).toBeInTheDocument())
  })

  it('imports non-duplicate rows via bulkAdd and triggers callback', async () => {
    const onImportado = vi.fn()
    render(<ImportarCSV eventoId={1} categorias={categorias} onImportado={onImportado} />)
    dropCsv('dorsal,nombre,apellido,genero,año_nacimiento,email,telefono\n201,Carla,Lima,F,1995,a@b.com,5550000\n')
    await waitFor(() => expect(screen.getByText(/Importar 1 atleta/)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/Importar 1 atleta/))
    await waitFor(() => expect(onImportado).toHaveBeenCalled())
    const stored = await db.atletas.toArray()
    expect(stored).toHaveLength(1)
    expect(stored[0].dorsal).toBe('201')
    expect(stored[0].genero).toBe('F')
    expect(stored[0].añoNacimiento).toBe(1995)
  })
})
