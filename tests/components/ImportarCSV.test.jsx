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

// Windows-1252 bytes for Latin-1-only text — what Excel's plain "CSV" format
// writes on Windows.
const windows1252 = s => Uint8Array.from(s, c => c.charCodeAt(0))

// Drops the CSV, accepts the default mapping and returns the stored atletas
// ordered by dorsal.
async function importar(csv, cats = categorias) {
  const onImportado = vi.fn()
  render(<ImportarCSV eventoId={1} categorias={cats} onImportado={onImportado} />)
  dropCsv(csv)
  fireEvent.click(await screen.findByRole('button', { name: /^Importar/ }))
  await waitFor(() => expect(onImportado).toHaveBeenCalled())
  return db.atletas.orderBy('dorsal').toArray()
}

const dosCategorias = [
  { id: 'cat-M', nombre: 'M 30-34', olas: [{ id: 'm1', nombre: 'Ola 1' }, { id: 'm2', nombre: 'Ola 2' }] },
  { id: 'cat-F', nombre: 'F 30-34', olas: [{ id: 'f1', nombre: 'Ola 1' }] },
]

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

describe('ImportarCSV — archivos hechos en Excel', () => {
  it('reads capitalised, accented headers separated by ;', async () => {
    render(<ImportarCSV eventoId={1} categorias={categorias} onImportado={() => {}} />)
    dropCsv('Dorsal;Nombre;Apellidos;Género;Año de nacimiento\n301;Ana;Peña;F;1990\n')
    const boton = await screen.findByRole('button', { name: /^Importar/ })
    expect(boton).toHaveTextContent(/^Importar 1 atleta$/)

    fireEvent.click(boton)
    await waitFor(async () => expect(await db.atletas.count()).toBe(1))
    const [a] = await db.atletas.toArray()
    expect(a).toMatchObject({ dorsal: '301', nombre: 'Ana', apellido: 'Peña', genero: 'F', añoNacimiento: 1990 })
  })

  it('ignores the blank rows Excel leaves at the end', async () => {
    render(<ImportarCSV eventoId={1} categorias={categorias} onImportado={() => {}} />)
    dropCsv('dorsal;nombre\n1;Ana\n;\n;\n')
    expect(await screen.findByText(/Vista previa/)).toHaveTextContent('Vista previa · 1 atletas')
    expect(screen.queryByText(/dorsal duplicado o vacío/)).toBeNull()
  })

  it('keeps accents and birth year from a Windows-1252 (ANSI) file', async () => {
    const [a] = await importar(windows1252('dorsal,nombre,apellido,año_nacimiento\n7,José,Peña,1990\n'))
    expect(a).toMatchObject({ nombre: 'José', apellido: 'Peña', añoNacimiento: 1990 })
  })

  it('stores a missing birth year as null, not 0', async () => {
    const [a] = await importar('dorsal,nombre\n5,Eva\n')
    expect(a.añoNacimiento).toBeNull()
  })
})

describe('ImportarCSV — categorías y olas', () => {
  it('assigns each CSV category to the event category with the same name', async () => {
    const atletas = await importar('dorsal,nombre,categoria\n1,Ana,f 30-34\n2,Beto,M 30-34\n', dosCategorias)
    expect(atletas.map(a => [a.dorsal, a.categoriaId])).toEqual([['1', 'cat-F'], ['2', 'cat-M']])
  })

  it('leaves a CSV category with no matching name as Sin categoría', async () => {
    const [a] = await importar('dorsal,nombre,categoria\n1,Ana,Sub-23\n', dosCategorias)
    expect(a.categoriaId).toBe('')
  })

  it('matches each ola inside its own category', async () => {
    const atletas = await importar(
      'dorsal,nombre,categoria,ola\n1,Ana,F 30-34,Ola 1\n2,Beto,M 30-34,Ola 2\n3,Caro,M 30-34,Ola 1\n',
      dosCategorias,
    )
    expect(atletas.map(a => [a.dorsal, a.categoriaId, a.olaId])).toEqual([
      ['1', 'cat-F', 'f1'],
      ['2', 'cat-M', 'm2'],
      ['3', 'cat-M', 'm1'],
    ])
  })

  it('uses the ola the operator picks by hand', async () => {
    const onImportado = vi.fn()
    render(<ImportarCSV eventoId={1} categorias={dosCategorias} onImportado={onImportado} />)
    dropCsv('dorsal,nombre,categoria,ola\n1,Ana,M 30-34,Ola 1\n')
    fireEvent.change(await screen.findByDisplayValue('M 30-34 / Ola 1'), { target: { value: 'm2' } })
    fireEvent.click(screen.getByRole('button', { name: /^Importar/ }))
    await waitFor(() => expect(onImportado).toHaveBeenCalled())
    const [a] = await db.atletas.toArray()
    expect(a.olaId).toBe('m2')
  })

  it('re-matches the ola by name when its category mapping changes', async () => {
    const onImportado = vi.fn()
    render(<ImportarCSV eventoId={1} categorias={dosCategorias} onImportado={onImportado} />)
    dropCsv('dorsal,nombre,categoria,ola\n1,Ana,M 30-34,Ola 1\n')
    fireEvent.change(await screen.findByDisplayValue('M 30-34 / Ola 1'), { target: { value: 'm2' } })
    fireEvent.change(screen.getByDisplayValue('M 30-34'), { target: { value: 'cat-F' } })
    fireEvent.click(screen.getByRole('button', { name: /^Importar/ }))
    await waitFor(() => expect(onImportado).toHaveBeenCalled())
    const [a] = await db.atletas.toArray()
    expect(a).toMatchObject({ categoriaId: 'cat-F', olaId: 'f1' })
  })

  it('without a categoria column, takes the category from a uniquely named ola', async () => {
    const [a] = await importar('dorsal,nombre,ola\n1,Ana,Ola 2\n', dosCategorias)
    expect(a).toMatchObject({ categoriaId: 'cat-M', olaId: 'm2' })
  })
})
