import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'

const TIPO_COLORES = {
  triatlón: 'bg-blue-600',
  duatlón: 'bg-orange-600',
  carrera: 'bg-green-600',
  ciclismo: 'bg-purple-600',
  otro: 'bg-slate-600',
}

const ESTADO_BADGE = {
  borrador: 'bg-slate-700 text-slate-300',
  activo: 'bg-green-800 text-green-200',
  finalizado: 'bg-slate-800 text-slate-400',
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
    await db.eventos.delete(id)
    await db.atletas.where('eventoId').equals(id).delete()
    await db.tiempos.where('eventoId').equals(id).delete()
    setEventos(prev => prev.filter(ev => ev.id !== id))
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Cronometraje</h1>
            <p className="text-slate-400 mt-1">Gestión de eventos de carrera</p>
          </div>
          <button
            onClick={() => navigate('/eventos/nuevo')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            + Nuevo evento
          </button>
        </div>

        {eventos.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <div className="text-5xl mb-4">🏁</div>
            <p className="text-lg">No hay eventos aún</p>
            <p className="text-sm mt-1">Crea tu primer evento para comenzar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eventos.map(ev => (
              <div
                key={ev.id}
                onClick={() => navigate(`/eventos/${ev.id}`)}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5 cursor-pointer hover:border-slate-500 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full text-white ${TIPO_COLORES[ev.tipo] ?? TIPO_COLORES.otro}`}>
                        {ev.tipo}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_BADGE[ev.estado]}`}>
                        {ev.estado}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-white mt-2 truncate">{ev.nombre}</h2>
                    <p className="text-slate-400 text-sm mt-1">
                      {ev.lugar} · {ev.fecha}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                      <span>{ev.distancias?.length ?? 0} distancias</span>
                      <span>{ev.categorias?.length ?? 0} categorías</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => eliminarEvento(e, ev.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1 shrink-0"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/pantalla')}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Abrir pantalla de resultados →
          </button>
        </div>
      </div>
    </div>
  )
}
