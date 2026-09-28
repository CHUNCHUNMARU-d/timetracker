import { describe, it, expect } from 'vitest'
import { normalizarEncabezado, decodificarCSV, emparejarPorNombre, resultadosACSV } from '../../src/utils/csv'

// Windows-1252 bytes for Latin-1-only text — what Excel's plain "CSV" format
// writes on Windows.
const windows1252 = s => Uint8Array.from(s, c => c.charCodeAt(0))

describe('normalizarEncabezado', () => {
  it.each([
    ['Dorsal', 'dorsal'],
    [' NOMBRE ', 'nombre'],
    ['Apellidos', 'apellido'],
    ['Género', 'genero'],
    ['Sexo', 'genero'],
    ['Año de nacimiento', 'año_nacimiento'],
    ['año_nacimiento', 'año_nacimiento'],
    ['Categoría', 'categoria'],
    ['OLA', 'ola'],
    ['E-mail', 'email'],
    ['Correo electrónico', 'email'],
    ['Teléfono', 'telefono'],
    ['Celular', 'telefono'],
  ])('%s → %s', (encabezado, esperado) => {
    expect(normalizarEncabezado(encabezado)).toBe(esperado)
  })
})

describe('decodificarCSV', () => {
  it('reads UTF-8 files as UTF-8', () => {
    expect(decodificarCSV(new TextEncoder().encode('nombre\nJosé Peña'))).toBe('nombre\nJosé Peña')
  })

  it('falls back to Windows-1252 when the bytes are not valid UTF-8', () => {
    expect(decodificarCSV(windows1252('año_nacimiento,nombre\n1990,José'))).toBe('año_nacimiento,nombre\n1990,José')
  })
})

describe('emparejarPorNombre', () => {
  const categorias = [
    { id: 'm', nombre: 'M 30-34' },
    { id: 'f', nombre: 'F 30-34' },
    { id: 'e', nombre: 'Élite' },
  ]

  it.each([
    ['F 30-34', 'f'],
    [' m 30-34 ', 'm'],
    ['elite', 'e'],
    ['Sub-23', ''],
  ])('%s → "%s"', (valor, esperado) => {
    expect(emparejarPorNombre(valor, categorias)).toBe(esperado)
  })

  it('does not guess when several options share the name', () => {
    const olas = [{ id: 'a1', nombre: 'Ola 1' }, { id: 'b1', nombre: 'Ola 1' }]
    expect(emparejarPorNombre('Ola 1', olas)).toBe('')
  })
})

describe('resultadosACSV', () => {
  const ana = {
    lugarGeneral: 1, lugarCategoria: 1, dorsal: '42', nombre: 'Ana López', genero: 'F',
    categoria: 'F 30-34', ola: 'Ola 1', distancia: 'Sprint', tiempoNeto: 3_723_000, status: 'activo',
  }
  const juan = {
    lugarGeneral: null, lugarCategoria: null, dorsal: '7', nombre: 'Pérez, Juan', genero: 'M',
    categoria: 'M 30-34', ola: '', distancia: 'Sprint', tiempoNeto: 4_000_000, status: 'dsq',
  }

  it('writes a BOM, a header row and one CRLF line per result, hiding times of non-active athletes', () => {
    expect(resultadosACSV([ana, juan])).toBe(
      '﻿Lugar,Dorsal,Nombre,Género,Categoría,Ola,Distancia,Tiempo,Lugar cat.,Estado\r\n' +
      '1,42,Ana López,F,F 30-34,Ola 1,Sprint,01:02:03,1,Activo\r\n' +
      ',7,"Pérez, Juan",M,M 30-34,,Sprint,,,DSQ',
    )
  })

  it('neutralises names that a spreadsheet would run as formulas', () => {
    const [, linea] = resultadosACSV([{ ...ana, nombre: '=1+1' }]).split('\r\n')
    expect(linea).toBe(`1,42,"'=1+1",F,F 30-34,Ola 1,Sprint,01:02:03,1,Activo`)
  })
})
