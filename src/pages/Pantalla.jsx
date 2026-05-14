import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { db, getResultados } from '../db'
import { msAHora } from '../utils/tiempo'
import { escucharActualizaciones } from '../utils/sync'

export default function Pantalla() {
  const { id } = useParams()
  const [eventoId, setEventoId] = useState(id ? Number(id) : null)
  const [eventos, setEventos] = useState([])
  const [evento, setEvento] = useState(null)
  const [filas, setFilas] = useState([])
  const [filtroDist, setFiltroDist] = useState('')
  const fileInputRef = useRef()

  // Load event list for selector
  useEffect(() => {
    db.eventos.toArray().then(setEventos)
  }, [])

  async function cargarResultados(eid) {
    const datos = await getResultados(eid)
    setEvento(datos.evento)
    setFilas(datos.filas)
  }

  useEffect(() => {
    if (!eventoId) return
    cargarResultados(eventoId)
    // Poll every 5s as fallback
    const interval = setInterval(() => cargarResultados(eventoId), 5000)
    // BroadcastChannel for instant updates
    const unsub = escucharActualizaciones(({ eventoId: eid }) => {
      if (eid === eventoId) cargarResultados(eventoId)
    })
    return () => { clearInterval(interval); unsub() }
  }, [eventoId])

  function importarJSON(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const { evento: ev2, filas: f2 } = JSON.parse(ev.target.result)
        setEvento(ev2)
        setFilas(f2)
        setEventoId(null)
      } catch {
        alert('Archivo JSON inválido')
      }
    }
    reader.readAsText(file)
  }

  const filasFiltradas = filtroDist
    ? filas.filter(f => f.distanciaId === filtroDist)
    : filas

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Control bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center gap-4 flex-wrap">
        <span className="text-slate-400 font-semibold text-sm">PANTALLA</span>
        <select
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
          value={eventoId ?? ''}
          onChange={e => setEventoId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Seleccionar evento...</option>
          {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
        </select>
        {evento?.distancias?.length > 1 && (
          <div className="flex gap-1">
            <button
              onClick={() => setFiltroDist('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!filtroDist ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
            >
              Todos
            </button>
            {evento.distancias.map(d => (
              <button
                key={d.id}
                onClick={() => setFiltroDist(d.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroDist === d.id ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
              >
                {d.nombre}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="ml-auto text-slate-500 hover:text-white text-xs transition-colors"
        >
          📂 Importar JSON
        </button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={importarJSON} />
      </div>

      {/* Header */}
      {evento && (
        <div className="text-center py-6 px-4 border-b border-slate-800">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">{evento.nombre}</h1>
          <p className="text-slate-400 text-lg mt-2">{evento.lugar} · {evento.fecha}</p>
        </div>
      )}

      {/* Results table */}
      {!evento ? (
        <div className="flex-1 flex items-center justify-center text-slate-600 flex-col gap-4">
          <div className="text-6xl">🏁</div>
          <p className="text-xl">Selecciona un evento para mostrar resultados</p>
        </div>
      ) : filasFiltradas.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-600 flex-col gap-4">
          <div className="text-6xl animate-pulse">⏱</div>
          <p className="text-2xl">Esperando llegadas...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-4 py-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-sm uppercase tracking-widest border-b border-slate-800">
                <th className="pb-3 px-3 w-16">#</th>
                <th className="pb-3 px-3 w-20">Dorsal</th>
                <th className="pb-3 px-3">Nombre</th>
                <th className="pb-3 px-3 hidden md:table-cell">Categoría</th>
                <th className="pb-3 px-3 hidden lg:table-cell">Distancia</th>
                <th className="pb-3 px-3 text-right">Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {filasFiltradas.map((f, i) => (
                <tr
                  key={f.atletaId ?? f.dorsal}
                  className={`border-b border-slate-900 ${i === 0 ? 'text-yellow-300' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-400'}`}
                >
                  <td className="py-4 px-3 text-3xl font-black">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-2xl text-slate-600">{f.lugarGeneral}</span>}
                  </td>
                  <td className="py-4 px-3 font-mono text-2xl font-bold text-white">{f.dorsal}</td>
                  <td className="py-4 px-3 text-3xl md:text-4xl font-bold text-white">{f.nombre}</td>
                  <td className="py-4 px-3 hidden md:table-cell text-xl text-slate-400">{f.categoria}</td>
                  <td className="py-4 px-3 hidden lg:table-cell text-xl text-slate-500">{f.distancia}</td>
                  <td className="py-4 px-3 text-right font-mono text-3xl md:text-4xl font-black text-emerald-400">
                    {msAHora(f.tiempoNeto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-3 text-slate-700 text-xs border-t border-slate-900">
        Cronometraje de Carreras · {filasFiltradas.length} clasificados · actualización automática
      </div>
    </div>
  )
}
