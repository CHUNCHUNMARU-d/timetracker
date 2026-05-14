import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { db } from '../db'
import { uid } from '../utils/tiempo'

const COLUMNAS = ['dorsal', 'nombre', 'apellido', 'genero', 'año_nacimiento', 'email', 'telefono']

export default function ImportarCSV({ eventoId, categorias, distancias, onImportado }) {
  const [preview, setPreview] = useState(null)
  const [mapeoCat, setMapeoCat] = useState({})
  const [mapeoDist, setMapeoDist] = useState({})
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const inputRef = useRef()

  function procesarArchivo(file) {
    setError('')
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        if (!data.length) { setError('El archivo está vacío'); return }
        // Detect category/distance columns from first row
        const keys = Object.keys(data[0])
        const tieneCat = keys.includes('categoria')
        const tieneDist = keys.includes('distancia')
        setPreview({ filas: data, tieneCat, tieneDist })
        // Build unique category/distance strings for mapping
        if (tieneCat) {
          const uniq = [...new Set(data.map(r => r.categoria).filter(Boolean))]
          const map = {}
          uniq.forEach(u => { map[u] = categorias[0]?.id ?? '' })
          setMapeoCat(map)
        }
        if (tieneDist) {
          const uniq = [...new Set(data.map(r => r.distancia).filter(Boolean))]
          const map = {}
          uniq.forEach(u => { map[u] = distancias[0]?.id ?? '' })
          setMapeoDist(map)
        }
      },
      error: () => setError('Error al leer el archivo CSV'),
    })
  }

  function onDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer?.files[0]
    if (file) procesarArchivo(file)
  }

  async function confirmarImport() {
    if (!preview) return
    setCargando(true)
    const atletas = preview.filas.map(row => ({
      eventoId,
      dorsal: String(row.dorsal ?? '').trim(),
      nombre: row.nombre?.trim() ?? '',
      apellido: row.apellido?.trim() ?? '',
      genero: row.genero?.trim().toUpperCase() ?? 'M',
      añoNacimiento: Number(row.año_nacimiento) || 0,
      categoriaId: preview.tieneCat ? (mapeoCat[row.categoria] ?? '') : '',
      distanciaId: preview.tieneDist ? (mapeoDist[row.distancia] ?? '') : '',
      email: row.email?.trim() ?? '',
      telefono: row.telefono?.trim() ?? '',
    }))
    await db.atletas.bulkAdd(atletas)
    setCargando(false)
    setPreview(null)
    onImportado()
  }

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Vista previa — {preview.filas.length} atletas</h3>
          <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-white text-sm">Cancelar</button>
        </div>

        {/* Category mapping */}
        {preview.tieneCat && Object.keys(mapeoCat).length > 0 && (
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 space-y-2">
            <p className="text-sm text-slate-400 mb-2">Mapear categorías del CSV a las categorías del evento:</p>
            {Object.keys(mapeoCat).map(csvCat => (
              <div key={csvCat} className="flex items-center gap-3">
                <span className="text-sm text-slate-300 w-32 shrink-0">{csvCat}</span>
                <select
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
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

        {/* Distance mapping */}
        {preview.tieneDist && Object.keys(mapeoDist).length > 0 && (
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 space-y-2">
            <p className="text-sm text-slate-400 mb-2">Mapear distancias del CSV:</p>
            {Object.keys(mapeoDist).map(csvDist => (
              <div key={csvDist} className="flex items-center gap-3">
                <span className="text-sm text-slate-300 w-32 shrink-0">{csvDist}</span>
                <select
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
                  value={mapeoDist[csvDist]}
                  onChange={e => setMapeoDist(p => ({ ...p, [csvDist]: e.target.value }))}
                >
                  <option value="">Sin distancia</option>
                  {distancias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800 text-slate-400">
              <tr>
                {COLUMNAS.map(c => <th key={c} className="px-3 py-2 font-medium">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {preview.filas.slice(0, 5).map((row, i) => (
                <tr key={i} className="border-t border-slate-800 text-slate-300">
                  {COLUMNAS.map(c => <td key={c} className="px-3 py-1.5 truncate max-w-[120px]">{row[c] ?? '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {preview.filas.length > 5 && (
            <p className="text-xs text-slate-500 text-center py-2">... y {preview.filas.length - 5} más</p>
          )}
        </div>

        <button
          onClick={confirmarImport}
          disabled={cargando}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          {cargando ? 'Importando...' : `Importar ${preview.filas.length} atletas`}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-slate-600 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors"
      >
        <div className="text-3xl mb-2">📂</div>
        <p className="text-slate-300 font-medium">Arrastra un CSV o haz clic para seleccionar</p>
        <p className="text-slate-500 text-xs mt-2">
          Columnas: dorsal, nombre, apellido, genero, año_nacimiento, categoria, distancia, email, telefono
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => e.target.files[0] && procesarArchivo(e.target.files[0])}
        />
      </div>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  )
}
