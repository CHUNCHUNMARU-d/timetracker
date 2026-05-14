import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getResultados } from '../db'
import { msAHora } from '../utils/tiempo'
import { exportarResultadosPDF } from '../utils/pdf'
import { compartirWhatsApp } from '../utils/share'

export default function Resultados() {
  const { id } = useParams()
  const navigate = useNavigate()
  const eventoId = Number(id)

  const [evento, setEvento] = useState(null)
  const [filas, setFilas] = useState([])
  const [filtroDist, setFiltroDist] = useState('')
  const [filtroCat, setFiltroCat] = useState('')
  const [filtroGen, setFiltroGen] = useState('')
  const [cargando, setCargando] = useState(true)

  async function cargar() {
    setCargando(true)
    const datos = await getResultados(eventoId)
    setEvento(datos.evento)
    setFilas(datos.filas)
    setCargando(false)
  }

  useEffect(() => { cargar() }, [eventoId])

  function exportarJSON() {
    const data = JSON.stringify({ evento, filas }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resultados_${evento.nombre.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (cargando) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Cargando...</div>
  if (!evento) return null

  const filasFiltradas = filas.filter(f =>
    (!filtroDist || f.distanciaId === filtroDist) &&
    (!filtroCat || f.categoriaId === filtroCat) &&
    (!filtroGen || f.genero === filtroGen)
  )

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate(`/eventos/${id}`)} className="text-slate-400 hover:text-white text-sm mb-3 block transition-colors">
            ← {evento.nombre}
          </button>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-xl font-bold text-white">Resultados</h1>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => exportarResultadosPDF(evento, filasFiltradas)}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                📄 Exportar PDF
              </button>
              <button
                onClick={exportarJSON}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                📤 Exportar JSON
              </button>
              <button
                onClick={cargar}
                className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                ↻ Actualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-5">
          <select
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
            value={filtroDist}
            onChange={e => setFiltroDist(e.target.value)}
          >
            <option value="">Todas las distancias</option>
            {evento.distancias?.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
          <select
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
            value={filtroCat}
            onChange={e => setFiltroCat(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {evento.categorias?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
            value={filtroGen}
            onChange={e => setFiltroGen(e.target.value)}
          >
            <option value="">Todos los géneros</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
          <span className="text-slate-500 text-sm self-center">{filasFiltradas.length} resultados</span>
        </div>

        {filasFiltradas.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <div className="text-4xl mb-3">🏁</div>
            <p>No hay resultados aún</p>
            <p className="text-xs mt-1">Los tiempos aparecerán aquí cuando se registren llegadas</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Dorsal</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Categoría</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Distancia</th>
                  <th className="px-4 py-3">Tiempo</th>
                  <th className="px-4 py-3 hidden md:table-cell">Cat.</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filasFiltradas.map((f, i) => (
                  <tr key={f.atletaId} className={`border-t border-slate-800 ${i < 3 ? 'bg-emerald-900/10' : ''}`}>
                    <td className="px-4 py-3 font-bold text-white">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : f.lugarGeneral}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-300">{f.dorsal}</td>
                    <td className="px-4 py-3 text-white">
                      {f.nombre}
                      {f.editado && <span className="ml-1 text-xs text-blue-400">✏</span>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-400">{f.categoria}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-400">{f.distancia}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">{msAHora(f.tiempoNeto)}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">{f.lugarCategoria}°</td>
                    <td className="px-4 py-3">
                      <WhatsAppShare fila={f} evento={evento} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function WhatsAppShare({ fila, evento }) {
  function enviar() {
    const msg = `🏅 *${evento.nombre}*\n` +
      `👤 ${fila.nombre}\n` +
      `⏱ Tiempo: *${msAHora(fila.tiempoNeto)}*\n` +
      `🏆 Lugar general: ${fila.lugarGeneral}°\n` +
      `📊 Lugar en categoría (${fila.categoria}): ${fila.lugarCategoria}°\n` +
      `📍 ${evento.lugar} · ${evento.fecha}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }
  return (
    <button onClick={enviar} title="Compartir por WhatsApp" className="text-slate-500 hover:text-green-400 transition-colors">
      📱
    </button>
  )
}
