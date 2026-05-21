import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { db } from '../db'
import { esEditable } from '../utils/estado'
import NeonButton from './ui/NeonButton'

const COLUMNAS = ['dorsal', 'nombre', 'apellido', 'genero', 'año_nacimiento', 'email', 'telefono']

export default function ImportarCSV({ eventoId, evento, categorias, distancias = [], onImportado }) {
  const bloqueado = evento && !esEditable(evento)
  const todasLasOlas = categorias.flatMap(c =>
    (c.olas ?? []).map(o => ({ id: o.id, label: `${c.nombre} / ${o.nombre}`, categoriaId: c.id }))
  )
  const [preview, setPreview] = useState(null)
  const [mapeoCat, setMapeoCat] = useState({})
  const [mapeoOla, setMapeoOla] = useState({})
  const [distanciaId, setDistanciaId] = useState(distancias[0]?.id ?? '')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const inputRef = useRef()

  function procesarArchivo(file) {
    setError('')
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
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
          uniq.forEach(u => { map[u] = categorias[0]?.id ?? '' })
          setMapeoCat(map)
        }
        if (tieneOla) {
          const uniq = [...new Set(data.map(r => r.ola).filter(Boolean))]
          const map = {}
          uniq.forEach(u => { map[u] = todasLasOlas[0]?.id ?? '' })
          setMapeoOla(map)
        }
      },
      error: () => setError('Error al leer el archivo CSV'),
    })
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
    const atletas = limpias.map(row => ({
      eventoId,
      dorsal: String(row.dorsal ?? '').trim(),
      nombre: row.nombre?.trim() ?? '',
      apellido: row.apellido?.trim() ?? '',
      genero: row.genero?.trim().toUpperCase() ?? 'M',
      añoNacimiento: Number(row.año_nacimiento) || 0,
      categoriaId: preview.tieneCat ? (mapeoCat[row.categoria] ?? '') : '',
      olaId: preview.tieneOla ? (mapeoOla[row.ola] ?? '') : '',
      distanciaId,
      status: 'activo',
      email: row.email?.trim() ?? '',
      telefono: row.telefono?.trim() ?? '',
    }))
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
                <span className="text-sm text-text-mid w-32 shrink-0">{csvCat}</span>
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

        {preview.tieneOla && Object.keys(mapeoOla).length > 0 && (
          <div className="bg-bg p-4 border border-border space-y-2">
            <p className="text-[10px] font-display uppercase tracking-widest text-text-lo mb-2">
              Mapear olas del CSV
            </p>
            {Object.keys(mapeoOla).map(csvOla => (
              <div key={csvOla} className="flex items-center gap-3">
                <span className="text-sm text-text-mid w-32 shrink-0">{csvOla}</span>
                <select
                  className={inputCls}
                  value={mapeoOla[csvOla]}
                  onChange={e => setMapeoOla(p => ({ ...p, [csvOla]: e.target.value }))}
                >
                  <option value="">Sin ola</option>
                  {todasLasOlas.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            ))}
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
