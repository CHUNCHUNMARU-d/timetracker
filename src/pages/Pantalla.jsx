import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { db, getResultados } from '../db'
import { msAHora } from '../utils/tiempo'
import { escucharActualizaciones } from '../utils/sync'
import PhaseBadge from '../components/ui/PhaseBadge'

export default function Pantalla() {
  const { id } = useParams()
  const [eventoId, setEventoId] = useState(id ? Number(id) : null)
  const [eventos, setEventos] = useState([])
  const [evento, setEvento] = useState(null)
  const [filas, setFilas] = useState([])
  const [filtroDist, setFiltroDist] = useState('')
  const fileInputRef = useRef()

  useEffect(() => { db.eventos.toArray().then(setEventos) }, [])

  async function cargarResultados(eid) {
    const datos = await getResultados(eid)
    if (!datos.evento) return
    setEvento(datos.evento)
    setFilas(datos.filas)
  }

  useEffect(() => {
    if (!eventoId) return
    cargarResultados(eventoId)
    const interval = setInterval(() => cargarResultados(eventoId), 5000)
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
    <div className="min-h-screen bg-bg text-text-hi flex flex-col">
      {/* Control bar */}
      <div className="bg-surface border-b border-border px-6 py-3 flex items-center gap-4 flex-wrap">
        <span className="font-display text-[10px] uppercase tracking-[0.4em] text-text-lo">
          📺 Pantalla
        </span>
        {evento && <PhaseBadge estado={evento.estado} />}
        <select
          className="bg-bg border border-border focus:border-activa px-3 py-1.5 text-text-hi text-sm focus:outline-none"
          value={eventoId ?? ''}
          onChange={e => setEventoId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Seleccionar evento…</option>
          {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
        </select>
        {evento?.distancias?.length > 1 && filas.some(f => f.distanciaId) && (
          <div className="flex gap-1">
            <FilterChip active={!filtroDist} onClick={() => setFiltroDist('')}>Todos</FilterChip>
            {evento.distancias.map(d => (
              <FilterChip key={d.id} active={filtroDist === d.id} onClick={() => setFiltroDist(d.id)}>
                {d.nombre}
              </FilterChip>
            ))}
          </div>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="ml-auto text-text-lo hover:text-text-hi text-[10px] font-display uppercase tracking-widest transition-colors"
        >
          📂 Importar JSON
        </button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={importarJSON} />
      </div>

      {/* Header */}
      {evento && (
        <div className="text-center py-8 px-4 border-b border-border bg-grid">
          <p className="font-display text-[10px] uppercase tracking-[0.4em] text-text-lo mb-3">
            EN VIVO · ACTUALIZACIÓN AUTOMÁTICA
          </p>
          <h1 className="font-display text-4xl md:text-7xl font-bold text-text-hi tracking-tight leading-none">
            {evento.nombre}
          </h1>
          <p className="text-text-mid text-base md:text-xl mt-3 font-mono">
            {evento.lugar} <span className="text-text-lo">·</span> {evento.fecha}
          </p>
        </div>
      )}

      {/* Results table */}
      {!evento ? (
        <div className="flex-1 flex items-center justify-center text-text-lo flex-col gap-4">
          <div className="text-6xl opacity-60">🏁</div>
          <p className="font-display uppercase tracking-widest text-xl">Selecciona un evento</p>
        </div>
      ) : filasFiltradas.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-lo flex-col gap-4">
          <div className="text-6xl opacity-60 pulse-1s">⏱</div>
          <p className="font-display uppercase tracking-widest text-2xl">Esperando llegadas…</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-4 py-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-text-lo font-display uppercase tracking-[0.3em] text-xs border-b border-border">
                <th scope="col" className="pb-3 px-3 w-16">#</th>
                <th scope="col" className="pb-3 px-3 w-20">Dorsal</th>
                <th scope="col" className="pb-3 px-3">Nombre</th>
                <th scope="col" className="pb-3 px-3 hidden md:table-cell">Categoría</th>
                <th scope="col" className="pb-3 px-3 hidden lg:table-cell">Distancia</th>
                <th scope="col" className="pb-3 px-3 text-right">Tiempo</th>
              </tr>
            </thead>
            <tbody aria-live="polite" aria-atomic="false">
              {filasFiltradas.map((f, i) => {
                const medal = i === 0 ? 'text-prep' : i === 1 ? 'text-text-mid' : i === 2 ? 'text-prep/70' : 'text-text-mid'
                return (
                  <tr
                    key={f.atletaId ?? f.dorsal}
                    className={`border-b border-border ${medal}`}
                  >
                    <td className="py-4 px-3 text-3xl font-mono font-bold">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-2xl text-text-lo">{f.lugarGeneral}</span>}
                    </td>
                    <td className="py-4 px-3 font-mono text-2xl font-bold text-text-hi">{f.dorsal}</td>
                    <td className="py-4 px-3 font-display text-2xl md:text-4xl font-bold text-text-hi">{f.nombre}</td>
                    <td className="py-4 px-3 hidden md:table-cell text-xl text-text-mid">{f.categoria}</td>
                    <td className="py-4 px-3 hidden lg:table-cell text-xl text-text-lo">{f.distancia}</td>
                    <td className="py-4 px-3 text-right digits text-2xl md:text-4xl font-bold text-activa">
                      {msAHora(f.tiempoNeto)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-3 text-text-lo text-[10px] font-display uppercase tracking-widest border-t border-border">
        ◢◣ Stadium Timing · {filasFiltradas.length} clasificados · actualización 5s
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 border text-[11px] font-display uppercase tracking-widest transition-colors ${active ? 'border-activa text-activa' : 'border-border text-text-mid hover:border-border-hi'}`}
    >
      {children}
    </button>
  )
}
