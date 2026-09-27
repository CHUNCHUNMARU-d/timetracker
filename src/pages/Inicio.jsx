import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { CLS } from '../utils/estado'
import PhaseBadge from '../components/ui/PhaseBadge'
import NeonButton from '../components/ui/NeonButton'

const TIPO_LABEL = {
  triatlón: 'TRI',
  duatlón: 'DUA',
  carrera: 'RUN',
  ciclismo: 'BIKE',
  otro: 'ETC',
}

export default function Inicio() {
  const [eventos, setEventos] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    db.eventos.orderBy('fecha').reverse().toArray().then(setEventos)
  }, [])

  async function eliminarEvento(e, id) {
    e.stopPropagation()
    if (!confirm('¿Eliminar este evento y todos sus datos?')) return
    try {
      await db.transaction('rw', db.eventos, db.atletas, db.tiempos, async () => {
        await db.eventos.delete(id)
        await db.atletas.where('eventoId').equals(id).delete()
        await db.tiempos.where('eventoId').equals(id).delete()
      })
      setEventos(prev => prev.filter(ev => ev.id !== id))
    } catch (err) {
      alert(`Error al eliminar evento: ${err.message ?? err}`)
    }
  }

  return (
    <div className="min-h-screen bg-bg bg-grid">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <header className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.4em] text-text-lo mb-2">
              ◢◣ Stadium Timing
            </p>
            <h1 className="font-display text-5xl md:text-6xl font-bold text-text-hi leading-none">
              CRONÓ<span className="text-activa">·</span>METRO
            </h1>
            <p className="text-text-mid text-sm mt-2 font-mono">
              {eventos.length.toString().padStart(2, '0')} eventos · {eventos.filter(e => e.estado === 'activa').length} activos
            </p>
          </div>
          <NeonButton variant="primary" size="lg" onClick={() => navigate('/eventos/nuevo')}>
            + Nuevo evento
          </NeonButton>
        </header>

        {eventos.length === 0 ? (
          <div className="border border-border bg-surface py-20 text-center">
            <div className="text-5xl mb-4 opacity-60">🏁</div>
            <p className="font-display text-lg uppercase tracking-widest text-text-mid">Sin eventos</p>
            <p className="text-text-lo text-sm mt-2">Crea tu primer evento para comenzar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eventos.map(ev => {
              const estado = ev.estado ?? 'preparacion'
              const cls = CLS[estado] ?? CLS.preparacion
              return (
                <article
                  key={ev.id}
                  className="group relative bg-surface border border-border hover:border-border-hi transition-colors"
                >
                  {/* Phase-tinted left edge — 4px strip */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${cls.bg}`} aria-hidden="true" />

                  <div className="pl-5 pr-4 py-4 grid grid-cols-[1fr_auto] gap-4 items-start">
                    {/* Body — clickable */}
                    <button
                      type="button"
                      onClick={() => navigate(`/eventos/${ev.id}`)}
                      className="text-left focus-ring-activa"
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-display text-[10px] font-bold uppercase tracking-widest text-text-lo bg-elevated border border-border px-2 py-0.5">
                          {TIPO_LABEL[ev.tipo] ?? 'EVT'}
                        </span>
                        <PhaseBadge estado={estado} />
                        <span className="font-mono text-[10px] text-text-lo">
                          #{String(ev.id).padStart(4, '0')}
                        </span>
                      </div>
                      <h2 className="font-display text-xl md:text-2xl font-bold text-text-hi truncate">
                        {ev.nombre}
                      </h2>
                      <p className="text-text-mid text-sm mt-1">
                        {ev.lugar} <span className="text-text-lo">·</span> {ev.fecha}
                      </p>
                      <div className="flex gap-4 mt-3 text-[11px] font-mono text-text-lo uppercase tracking-wider">
                        <span>{ev.distancias?.length ?? 0} dist.</span>
                        <span>{ev.categorias?.length ?? 0} cat.</span>
                      </div>
                    </button>

                    {/* Actions column */}
                    <div className="flex flex-col items-end gap-2">
                      <NeonButton
                        variant="ghost"
                        size="sm"
                        as="a"
                        href={`/pantalla/${ev.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                      >
                        📺 Pantalla
                        <span className="opacity-60" aria-hidden="true">↗</span>
                      </NeonButton>
                      <button
                        type="button"
                        onClick={(e) => eliminarEvento(e, ev.id)}
                        className="opacity-0 group-hover:opacity-100 text-text-lo hover:text-danger transition-all text-xs px-2 py-1"
                        title="Eliminar"
                        aria-label={`Eliminar ${ev.nombre}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
