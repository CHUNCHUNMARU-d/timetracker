import Papa from 'papaparse'
import { msAHora } from './tiempo'

// Lowercase, no accents, words joined by "_" — "Año de nacimiento" → "ano_de_nacimiento".
// Shared by headers and names so Excel-typed variants still match.
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

// Normalized header → column name ImportarCSV reads.
const ENCABEZADOS = {
  dorsal: 'dorsal',
  nombre: 'nombre',
  apellido: 'apellido',
  apellidos: 'apellido',
  genero: 'genero',
  sexo: 'genero',
  ano_nacimiento: 'año_nacimiento',
  ano_de_nacimiento: 'año_nacimiento',
  categoria: 'categoria',
  ola: 'ola',
  email: 'email',
  e_mail: 'email',
  correo: 'email',
  correo_electronico: 'email',
  telefono: 'telefono',
  celular: 'telefono',
}

export function normalizarEncabezado(encabezado) {
  const n = normalizar(encabezado)
  return ENCABEZADOS[n] ?? n
}

// Excel's plain "CSV" format on Windows writes Windows-1252, not UTF-8. Decode
// strictly as UTF-8 first; bytes that aren't valid UTF-8 are Windows-1252.
export function decodificarCSV(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

// Id of the only option whose name matches `valor` ignoring case, accents and
// spacing. '' when none or several match — the operator then picks by hand.
export function emparejarPorNombre(valor, opciones) {
  const n = normalizar(valor)
  const coincidencias = opciones.filter(o => normalizar(o.nombre) === n)
  return coincidencias.length === 1 ? coincidencias[0].id : ''
}

const COLUMNAS_RESULTADOS = ['Lugar', 'Dorsal', 'Nombre', 'Género', 'Categoría', 'Ola', 'Distancia', 'Tiempo', 'Lugar cat.', 'Estado']

// Same rows and rules as the Resultados table. The BOM makes Excel open the
// file as UTF-8; escapeFormulae keeps a name like "=1+1" as plain text.
export function resultadosACSV(filas) {
  const data = filas.map(f => {
    const activo = (f.status ?? 'activo') === 'activo'
    return [
      f.lugarGeneral,
      f.dorsal,
      f.nombre,
      f.genero,
      f.categoria,
      f.ola,
      f.distancia,
      activo ? msAHora(f.tiempoNeto) : '',
      f.lugarCategoria,
      activo ? 'Activo' : f.status.toUpperCase(),
    ]
  })
  return '﻿' + Papa.unparse({ fields: COLUMNAS_RESULTADOS, data }, { escapeFormulae: true })
}
