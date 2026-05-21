import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getResultados } from '../db'
import { msAHora } from '../utils/tiempo'
import { exportarResultadosPDF, exportarResultadosCompletoPDF } from '../utils/pdf'
import StatusBadge from '../components/StatusBadge'
import PhaseBadge from '../components/ui/PhaseBadge'
import NeonButton from '../components/ui/NeonButton'

export default function Resultados() {
  const { id } = useParams()
  const navigate = useNavigate()
  const eventoId = Number(id)

  const [evento, setEvento] = useState(null)
  const [filas, setFilas] = useState([])
  const [filtroOla, setFiltroOla] = useState('')
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

  if (cargando) return (
    <div className="min-h-screen bg-bg flex items-center justify-center text-text-mid font-display uppercase tracking-widest text-sm">
      Cargando…
    </div>
  )
  if (!evento) return null

  const todasLasOlas = evento.categorias?.flatMap(c =>
    (c.olas ?? []).map(o => ({ id: o.id, label: `${c.nombre} / ${o.nombre}` }))
  ) ?? []

  const filasFiltradas = filas.filter(f =>
    (!filtroOla || f.olaId === filtroOla) &&
    (!filtroCat || f.categoriaId === filtroCat) &&
    (!filtroGen || f.genero === filtroGen)
  )

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-surface border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-3">
            <button onClick={() => navigate(`/eventos/${id}`)} className="text-text-mid hover:text-text-hi text-xs font-display uppercase tracking-widest transition-colors">
              ← {evento.nombre}
            </button>
            <button onClick={() => navigate('/')} className="text-text-mid hover:text-text-hi text-xs font-display uppercase tracking-widest transition-colors">
              🏠 Inicio
            </button>
            <a
              href={`/pantalla/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-bg border border-border-hi hover:border-activa hover:text-activa text-text-mid font-display text-[11px] uppercase tracking-widest transition-colors focus-ring-activa"
            >
              📺 Pantalla <span className="opacity-60" aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-text-hi">Resultados</h1>
              <PhaseBadge estado={evento.estado} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <NeonButton variant="primary" size="md" onClick={() => exportarResultadosCompletoPDF(evento, filas)}>
                📑 PDF por categoría
              </NeonButton>
              <NeonButton variant="ghost" size="md" onClick={() => exportarResultadosPDF(evento, filasFiltradas)}>
                📄 PDF
              </NeonButton>
              <NeonButton variant="ghost" size="md" onClick={exportarJSON}>
                📤 JSON
              </NeonButton>
              <NeonButton variant="ghost" size="md" onClick={cargar}>
                ↻
              </NeonButton>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-5">
          <select
            className="bg-surface border border-border focus:border-activa px-3 py-1.5 text-text-hi text-sm focus:outline-none"
            value={filtroOla}
            onChange={e => setFiltroOla(e.target.value)}
          >
            <option value="">Todas las olas</option>
            {todasLasOlas.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <select
            className="bg-surface border border-border focus:border-activa px-3 py-1.5 text-text-hi text-sm focus:outline-none"
            value={filtroCat}
            onChange={e => setFiltroCat(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {evento.categorias?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select
            className="bg-surface border border-border focus:border-activa px-3 py-1.5 text-text-hi text-sm focus:outline-none"
            value={filtroGen}
            onChange={e => setFiltroGen(e.target.value)}
          >
            <option value="">Todos los géneros</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
          <span className="text-text-lo text-xs font-mono self-center uppercase tracking-wider">
            {filasFiltradas.length} resultados
          </span>
        </div>

        {filasFiltradas.length === 0 ? (
          <div className="text-center py-20 border border-border bg-surface text-text-lo">
            <div className="text-4xl mb-3 opacity-60">🏁</div>
            <p className="font-display uppercase tracking-widest">Sin resultados</p>
            <p className="text-xs mt-1">Los tiempos aparecerán cuando se registren llegadas</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-border max-h-[70vh] table-sticky">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface text-text-lo text-[11px] font-display uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Dorsal</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Categoría</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Ola</th>
                  <th className="px-4 py-3 text-right">Tiempo</th>
                  <th className="px-4 py-3 hidden md:table-cell">Cat.</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filasFiltradas.map((f, i) => {
                  const inactivo = f.status && f.status !== 'activo'
                  return (
                    <tr
                      key={f.atletaId}
                      className={`border-t border-border hover:bg-elevated/40 transition-colors ${inactivo ? 'bg-bg/50 text-text-lo' : i < 3 ? 'bg-activa/[0.04]' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-text-hi">
                        {inactivo ? '—' : i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : f.lugarGeneral}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-text-mid">{f.dorsal}</td>
                      <td className="px-4 py-3 text-text-hi">
                        {f.nombre}
                        {f.editado && <span className="ml-1 text-xs text-activa" title={f.notaEdicion || 'Editado'}>✏</span>}
                        {inactivo && <span className="ml-2"><StatusBadge status={f.status} /></span>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-text-mid">{f.categoria}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-text-mid">{f.ola}</td>
                      <td className="px-4 py-3 text-right digits font-bold text-activa">
                        {inactivo ? <span className="text-text-lo">—</span> : msAHora(f.tiempoNeto)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-text-lo text-xs font-mono">
                        {inactivo ? '—' : `${f.lugarCategoria}°`}
                      </td>
                      <td className="px-4 py-3">
                        {!inactivo && <WhatsAppShare fila={f} evento={evento} />}
                      </td>
                    </tr>
                  )
                })}
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
    const subcat = fila.ola ? ` / ${fila.ola}` : ''
    const msg = `🏅 *${evento.nombre}*\n` +
      `👤 ${fila.nombre}\n` +
      `⏱ Tiempo: *${msAHora(fila.tiempoNeto)}*\n` +
      `🏆 Lugar general: ${fila.lugarGeneral}°\n` +
      `📊 Lugar en categoría (${fila.categoria}${subcat}): ${fila.lugarCategoria}°\n` +
      `📍 ${evento.lugar} · ${evento.fecha}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }
  return (
    <button onClick={enviar} title="Compartir por WhatsApp" className="text-text-lo hover:text-activa transition-colors" aria-label="Compartir por WhatsApp">
      📱
    </button>
  )
}
