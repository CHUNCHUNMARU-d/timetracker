import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { db } from '../db'
import { esEditable } from '../utils/estado'
import { normalizarEncabezado, decodificarCSV, emparejarPorNombre } from '../utils/csv'
import NeonButton from './ui/NeonButton'

const COLUMNAS = ['dorsal', 'nombre', 'apellido', 'genero', 'año_nacimiento', 'email', 'telefono']

// Ola names like "Ola 1" repeat across categories, so olas are mapped per
// (categoría, ola) pair as written in the CSV.
const clavePar = (cat, ola) => JSON.stringify([cat ?? '', ola])

export default function ImportarCSV({ eventoId, evento, categorias, distancias = [], onImportado }) {
  const bloqueado = evento && !esEditable(evento)
  const todasLasOlas = categorias.flatMap(c =>
    (c.olas ?? []).map(o => ({ id: o.id, nombre: o.nombre, label: `${c.nombre} / ${o.nombre}`, categoriaId: c.id }))
  )
  const [preview, setPreview] = useState(null)
  const [mapeoCat, setMapeoCat] = useState({})
  const [mapeoOla, setMapeoOla] = useState({}) // clavePar → ola elegida a mano
  const [distanciaId, setDistanciaId] = useState(distancias[0]?.id ?? '')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const inputRef = useRef()

  async function procesarArchivo(file) {
    setError('')
    let texto
    try {
      texto = decodificarCSV(await file.arrayBuffer())
    } catch {
      setError('Error al leer el archivo CSV')
      return
    }
    const { data } = Papa.parse(texto, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: normalizarEncabezado,
    })
    if (!data.length) { setError('El archivo está vacío'); return }
    const keys = Object.keys(data[0])
    const tieneCat = keys.includes('categoria')
    const tieneOla = keys.includes('ola')

    let existentes = new Set()
    try {
      const enDb = await db.atletas.where('eventoId').equals(eventoId).toArray()
      existentes = new Set(enDb.map(a => String(a.dorsal).trim()))
    } catch (err) {
      setError(`No se pudo verificar duplicados: ${err.message ?? err}`)
      return
    }
    const vistos = new Set()
    const filas = data.map(row => {
      const d = String(row.dorsal ?? '').trim()
      let dup = null
      if (!d) dup = 'sin-dorsal'
      else if (existentes.has(d)) dup = 'db'
      else if (vistos.has(d)) dup = 'csv'
      if (d) vistos.add(d)
      return { ...row, __duplicado: dup }
    })

    setPreview({ filas, tieneCat, tieneOla })
    if (tieneCat) {
      const uniq = [...new Set(data.map(r => r.categoria).filter(Boolean))]
      const map = {}
      uniq.forEach(u => { map[u] = emparejarPorNombre(u, categorias) })
      setMapeoCat(map)
    }
    setMapeoOla({})
  }

  // Olas selectable for a CSV pair: those of its mapped category, or every
  // ola when the CSV has no categoria column.
  function opcionesOla(csvCat) {
    if (!preview.tieneCat) return todasLasOlas
    return todasLasOlas.filter(o => o.categoriaId === mapeoCat[csvCat])
  }

  // Hand-picked ola while it still fits the pair's category, else the one
  // with the same name.
  function olaPara(csvCat, csvOla) {
    const opciones = opcionesOla(csvCat)
    const elegida = mapeoOla[clavePar(csvCat, csvOla)]
    if (elegida === '' || opciones.some(o => o.id === elegida)) return elegida
    return emparejarPorNombre(csvOla, opciones)
  }

  function onDrop(e) {
    e.preventDefault()
    if (bloqueado) return
    const file = e.dataTransfer?.files[0]
    if (file) procesarArchivo(file)
  }

  async function confirmarImport() {
    if (!preview) return
    setCargando(true)
    const limpias = preview.filas.filter(r => !r.__duplicado)
    const atletas = limpias.map(row => {
      const olaId = preview.tieneOla && row.ola ? olaPara(row.categoria, row.ola) : ''
      return {
        eventoId,
        dorsal: String(row.dorsal ?? '').trim(),
        nombre: row.nombre?.trim() ?? '',
        apellido: row.apellido?.trim() ?? '',
        genero: row.genero?.trim().toUpperCase() ?? 'M',
        añoNacimiento: Number(row.año_nacimiento) || null,
        // Without a categoria column the ola implies its category.
        categoriaId: preview.tieneCat
          ? (mapeoCat[row.categoria] ?? '')
          : (todasLasOlas.find(o => o.id === olaId)?.categoriaId ?? ''),
        olaId,
        distanciaId,
        status: 'activo',
        email: row.email?.trim() ?? '',
        telefono: row.telefono?.trim() ?? '',
      }
    })
    try {
      await db.atletas.bulkAdd(atletas)
    } catch (err) {
      setError(`Error al guardar: ${err.message ?? err}`)
      setCargando(false)
      return
    }
    setCargando(false)
    setPreview(null)
    onImportado()
  }

  if (bloqueado) {
    return (
      <div className="border border-border bg-bg px-4 py-3 text-text-mid text-xs font-display uppercase tracking-wider">
        🔒 Importación CSV disponible solo en fase Preparación
      </div>
    )
  }

  const numDup = preview?.filas.filter(r => r.__duplicado).length ?? 0
  const numImportables = preview ? preview.filas.length - numDup : 0
  const paresOla = preview?.tieneOla
    ? [...new Map(preview.filas.filter(r => r.ola).map(r => [clavePar(r.categoria, r.ola), [r.categoria ?? '', r.ola]]))]
    : []
  const inputCls = 'w-full bg-bg border border-border focus:border-activa px-3 py-2 text-text-hi text-sm focus:outline-none transition-colors'

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base uppercase tracking-widest text-text-hi">
            Vista previa · {preview.filas.length} atletas
          </h3>
          <button onClick={() => setPreview(null)} className="text-text-mid hover:text-text-hi text-xs font-display uppercase tracking-widest transition-colors">
            Cancelar
          </button>
        </div>

        {distancias.length > 0 && (
          <div className="bg-bg p-4 border border-border">
            <label className="block text-[10px] font-display uppercase tracking-widest text-text-lo mb-2">
              Distancia para todos los atletas importados
            </label>
            <select className={inputCls} value={distanciaId} onChange={e => setDistanciaId(e.target.value)}>
              <option value="">Selecciona una distancia</option>
              {distancias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
        )}

        {preview.tieneCat && Object.keys(mapeoCat).length > 0 && (
          <div className="bg-bg p-4 border border-border space-y-2">
            <p className="text-[10px] font-display uppercase tracking-widest text-text-lo mb-2">
              Mapear categorías del CSV
            </p>
            {Object.keys(mapeoCat).map(csvCat => (
              <div key={csvCat} className="flex items-center gap-3">
                <span className={`text-sm w-32 shrink-0 ${mapeoCat[csvCat] ? 'text-text-mid' : 'text-prep'}`}>
                  {mapeoCat[csvCat] ? csvCat : `⚠ ${csvCat}`}
                </span>
                <select
                  className={inputCls}
                  value={mapeoCat[csvCat]}
                  onChange={e => setMapeoCat(p => ({ ...p, [csvCat]: e.target.value }))}
                >
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {paresOla.length > 0 && (
          <div className="bg-bg p-4 border border-border space-y-2">
            <p className="text-[10px] font-display uppercase tracking-widest text-text-lo mb-2">
              Mapear olas del CSV
            </p>
            {paresOla.map(([clave, [csvCat, csvOla]]) => {
              const olaId = olaPara(csvCat, csvOla)
              const etiqueta = csvCat ? `${csvCat} / ${csvOla}` : csvOla
              return (
                <div key={clave} className="flex items-center gap-3">
                  <span className={`text-sm w-32 shrink-0 ${olaId ? 'text-text-mid' : 'text-prep'}`}>
                    {olaId ? etiqueta : `⚠ ${etiqueta}`}
                  </span>
                  <select
                    className={inputCls}
                    value={olaId}
                    onChange={e => setMapeoOla(p => ({ ...p, [clave]: e.target.value }))}
                  >
                    <option value="">Sin ola</option>
                    {opcionesOla(csvCat).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
              )
            })}
          </div>
        )}

        {numDup > 0 && (
          <div className="border border-prep/50 bg-prep/10 px-4 py-3 text-prep text-sm font-display uppercase tracking-wider">
            ⚠ {numDup} fila{numDup === 1 ? '' : 's'} con dorsal duplicado o vacío — se omitirán
          </div>
        )}

        <div className="overflow-x-auto border border-border">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg text-text-lo text-[10px] font-display uppercase tracking-widest">
              <tr>
                <th className="px-3 py-2 w-6"></th>
                {COLUMNAS.map(c => <th key={c} className="px-3 py-2">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {preview.filas.slice(0, 10).map((row, i) => (
                <tr key={i} className={`border-t border-border ${row.__duplicado ? 'text-prep bg-prep/5' : 'text-text-mid'}`}>
                  <td className="px-2 py-1.5 text-xs text-center" title={row.__duplicado ?? ''}>
                    {row.__duplicado === 'db' ? '⊘' : row.__duplicado === 'csv' ? '⇆' : row.__duplicado === 'sin-dorsal' ? '✗' : ''}
                  </td>
                  {COLUMNAS.map(c => <td key={c} className="px-3 py-1.5 truncate max-w-[120px]">{row[c] ?? '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {preview.filas.length > 10 && (
            <p className="text-xs text-text-lo text-center py-2">… y {preview.filas.length - 10} más</p>
          )}
        </div>

        <NeonButton
          variant="primary"
          size="lg"
          onClick={confirmarImport}
          disabled={cargando || numImportables === 0 || (distancias.length > 0 && !distanciaId)}
          className="w-full"
        >
          {cargando ? 'Importando…' : `Importar ${numImportables} atleta${numImportables === 1 ? '' : 's'}`}
        </NeonButton>
      </div>
    )
  }

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border hover:border-activa hover:bg-activa/5 p-8 text-center cursor-pointer transition-colors"
      >
        <div className="text-3xl mb-2 opacity-70">📂</div>
        <p className="text-text-hi font-display uppercase tracking-widest text-sm">
          Arrastra un CSV o haz clic
        </p>
        <p className="text-text-lo text-[10px] mt-3 font-mono uppercase tracking-wider">
          Columnas: dorsal, nombre, apellido, genero, año_nacimiento, categoria, ola, email, telefono
        </p>
        <p className="text-text-lo text-[10px] mt-1 font-mono uppercase tracking-wider">
          Mayúsculas y acentos dan igual · separador , o ;
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => e.target.files[0] && procesarArchivo(e.target.files[0])}
        />
      </div>
      {error && <p className="text-danger text-sm mt-2 font-display uppercase tracking-wider">{error}</p>}
    </div>
  )
}
