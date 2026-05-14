import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../db'
import { msAHora, ahora } from '../utils/tiempo'
import { emitirActualizacion } from '../utils/sync'

export default function Timing() {
  const { id } = useParams()
  const navigate = useNavigate()
  const eventoId = Number(id)

  const [evento, setEvento] = useState(null)
  const [atletas, setAtletas] = useState([])
  const [tiempos, setTiempos] = useState([])
  const [dorsal, setDorsal] = useState('')
  const [olaActiva, setOlaActiva] = useState(null)
  const [horaInicioGlobal, setHoraInicioGlobal] = useState(null)
  const [flash, setFlash] = useState(null) // { nombre, tiempo, error }
  const [modalEditar, setModalEditar] = useState(null)
  const [reloj, setReloj] = useState(0)
  const inputRef = useRef()

  useEffect(() => {
    async function cargar() {
      const ev = await db.eventos.get(eventoId)
      setEvento(ev)
      // Restore start time from DB if race was already started
      if (ev?.configuracion?.horaInicio) setHoraInicioGlobal(ev.configuracion.horaInicio)
      if (ev?.configuracion?.olaActiva) setOlaActiva(ev.configuracion.olaActiva)
      const a = await db.atletas.where('eventoId').equals(eventoId).toArray()
      setAtletas(a)
      const t = await db.tiempos.where('eventoId').equals(eventoId).toArray()
      setTiempos(t)
    }
    cargar()
  }, [eventoId])

  // Reloj en tiempo real
  useEffect(() => {
    if (!horaInicioGlobal) return
    const interval = setInterval(() => setReloj(Date.now() - horaInicioGlobal), 500)
    return () => clearInterval(interval)
  }, [horaInicioGlobal])

  // Auto focus input
  useEffect(() => { inputRef.current?.focus() }, [evento])

  function resolverHoraInicio() {
    if (evento?.configuracion?.inicioTipo === 'olas' && olaActiva) {
      const ola = evento.configuracion.olas.find(o => o.id === olaActiva)
      return ola?.horaInicio ?? horaInicioGlobal
    }
    return horaInicioGlobal
  }

  async function iniciarCarrera() {
    const hora = ahora()
    setHoraInicioGlobal(hora)
    await db.eventos.update(eventoId, {
      configuracion: { ...evento.configuracion, horaInicio: hora },
      estado: 'activo',
    })
    setEvento(p => ({ ...p, configuracion: { ...p.configuracion, horaInicio: hora }, estado: 'activo' }))
    inputRef.current?.focus()
  }

  async function iniciarOla(olaId) {
    const hora = ahora()
    const olas = evento.configuracion.olas.map(o =>
      o.id === olaId ? { ...o, horaInicio: hora } : o
    )
    setOlaActiva(olaId)
    if (!horaInicioGlobal) setHoraInicioGlobal(hora)
    await db.eventos.update(eventoId, {
      configuracion: { ...evento.configuracion, olas, horaInicio: horaInicioGlobal ?? hora, olaActiva: olaId },
      estado: 'activo',
    })
    setEvento(p => ({ ...p, configuracion: { ...p.configuracion, olas, olaActiva: olaId } }))
    inputRef.current?.focus()
  }

  async function registrarDorsal() {
    const d = dorsal.trim()
    if (!d) return
    setDorsal('')

    const horaStart = resolverHoraInicio()
    if (!horaStart) {
      setFlash({ error: 'Primero inicia la carrera o una ola' })
      setTimeout(() => setFlash(null), 2500)
      return
    }

    // Prevent duplicate
    const yaRegistrado = tiempos.find(t => t.dorsal === d)
    if (yaRegistrado) {
      const atleta = atletas.find(a => a.id === yaRegistrado.atletaId)
      setFlash({ error: `Dorsal ${d} ya registrado (${atleta?.nombre ?? ''})` })
      setTimeout(() => setFlash(null), 2500)
      return
    }

    const atletaEncontrado = atletas.find(a => a.dorsal === d)
    const horaLlegada = ahora()
    const tiempoNeto = horaLlegada - horaStart

    const registro = {
      eventoId,
      atletaId: atletaEncontrado?.id ?? null,
      dorsal: d,
      horaLlegada,
      tiempoNeto,
      olaId: olaActiva,
      editado: false,
      notaEdicion: '',
    }
    const newId = await db.tiempos.add(registro)
    const nuevoTiempo = { ...registro, id: newId }
    setTiempos(p => [nuevoTiempo, ...p])

    setFlash({
      nombre: atletaEncontrado ? `${atletaEncontrado.nombre} ${atletaEncontrado.apellido}` : `Dorsal ${d}`,
      tiempo: msAHora(tiempoNeto),
      desconocido: !atletaEncontrado,
    })
    setTimeout(() => setFlash(null), 3000)
    emitirActualizacion(eventoId)
    inputRef.current?.focus()
  }

  async function guardarEdicion({ id: tId, tiempoNeto, notaEdicion }) {
    await db.tiempos.update(tId, { tiempoNeto, editado: true, notaEdicion })
    setTiempos(p => p.map(t => t.id === tId ? { ...t, tiempoNeto, editado: true, notaEdicion } : t))
    emitirActualizacion(eventoId)
    setModalEditar(null)
  }

  async function eliminarTiempo(tId) {
    if (!confirm('¿Eliminar este registro de tiempo?')) return
    await db.tiempos.delete(tId)
    setTiempos(p => p.filter(t => t.id !== tId))
    emitirActualizacion(eventoId)
  }

  if (!evento) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>

  const esOlas = evento.configuracion?.inicioTipo === 'olas'
  const carreraIniciada = !!horaInicioGlobal

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(`/eventos/${id}`)} className="text-slate-400 hover:text-white text-sm transition-colors">
          ← {evento.nombre}
        </button>
        {carreraIniciada && (
          <div className="text-2xl font-mono font-bold text-emerald-400">
            {msAHora(reloj)}
          </div>
        )}
        <div className="text-slate-500 text-sm">{tiempos.length} llegadas</div>
      </div>

      {/* Bib input */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">

        {/* Start controls */}
        {!esOlas && !carreraIniciada && (
          <button
            onClick={iniciarCarrera}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xl font-bold px-12 py-5 rounded-2xl transition-colors"
          >
            🚀 Iniciar carrera
          </button>
        )}

        {esOlas && (
          <div className="w-full max-w-lg">
            <p className="text-slate-400 text-sm mb-3 text-center">Controles de olas:</p>
            <div className="grid grid-cols-2 gap-2">
              {evento.configuracion.olas.map(ola => {
                const iniciada = !!ola.horaInicio
                return (
                  <button
                    key={ola.id}
                    onClick={() => !iniciada && iniciarOla(ola.id)}
                    disabled={iniciada}
                    className={`py-3 px-4 rounded-xl font-semibold text-sm transition-colors ${iniciada ? 'bg-slate-700 text-slate-400 cursor-default' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                  >
                    {iniciada ? `✓ ${ola.nombre}` : `▶ ${ola.nombre}`}
                    {iniciada && <span className="block text-xs font-normal opacity-60">{new Date(ola.horaInicio).toLocaleTimeString('es-MX')}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Bib entry */}
        <div className={`w-full max-w-xs transition-opacity ${!carreraIniciada ? 'opacity-40 pointer-events-none' : ''}`}>
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={dorsal}
            onChange={e => setDorsal(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && registrarDorsal()}
            placeholder="Dorsal"
            className="w-full text-center text-6xl font-mono font-bold bg-slate-900 border-2 border-slate-700 focus:border-emerald-500 rounded-2xl py-6 text-white outline-none transition-colors"
          />
          <button
            onClick={registrarDorsal}
            className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xl font-bold py-4 rounded-2xl transition-colors"
          >
            Registrar llegada
          </button>
        </div>

        {/* Flash feedback */}
        {flash && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl text-center shadow-2xl z-50 min-w-[260px] ${flash.error ? 'bg-red-800 border border-red-600' : flash.desconocido ? 'bg-amber-800 border border-amber-600' : 'bg-emerald-800 border border-emerald-600'}`}>
            {flash.error ? (
              <p className="text-white font-semibold">{flash.error}</p>
            ) : (
              <>
                <p className="text-white font-bold text-lg">{flash.nombre}</p>
                <p className="text-emerald-300 text-2xl font-mono font-bold">{flash.tiempo}</p>
                {flash.desconocido && <p className="text-amber-300 text-xs mt-1">Dorsal no encontrado en la lista</p>}
              </>
            )}
          </div>
        )}
      </div>

      {/* Recent arrivals log */}
      {tiempos.length > 0 && (
        <div className="border-t border-slate-800 max-h-64 overflow-y-auto">
          <div className="px-4 py-2 text-xs text-slate-500 bg-slate-900/50">Llegadas recientes</div>
          {tiempos.slice(0, 20).map(t => {
            const a = atletas.find(at => at.dorsal === t.dorsal)
            return (
              <div key={t.id} className="flex items-center justify-between px-4 py-2 border-t border-slate-900 hover:bg-slate-900/50 group">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-white w-12">{t.dorsal}</span>
                  <span className="text-slate-300 text-sm">{a ? `${a.nombre} ${a.apellido}` : <span className="text-amber-500 text-xs">No registrado</span>}</span>
                  {t.editado && <span className="text-xs text-blue-400">✏</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-emerald-400 text-sm">{msAHora(t.tiempoNeto)}</span>
                  <button onClick={() => setModalEditar(t)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white text-xs transition-all">✏️</button>
                  <button onClick={() => eliminarTiempo(t.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 text-xs transition-all">✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalEditar && (
        <ModalEditar
          tiempo={modalEditar}
          onGuardar={guardarEdicion}
          onCerrar={() => setModalEditar(null)}
        />
      )}
    </div>
  )
}

function ModalEditar({ tiempo, onGuardar, onCerrar }) {
  const [valor, setValor] = useState(msAHora(tiempo.tiempoNeto))
  const [nota, setNota] = useState(tiempo.notaEdicion ?? '')

  function guardar() {
    const parts = valor.split(':').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return
    const ms = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000
    onGuardar({ id: tiempo.id, tiempoNeto: ms, notaEdicion: nota })
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700 space-y-4">
        <h3 className="text-white font-semibold">Editar tiempo — Dorsal {tiempo.dorsal}</h3>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Tiempo (HH:MM:SS)</label>
          <input
            className="w-full text-center text-3xl font-mono bg-slate-900 border border-slate-600 rounded-xl py-3 text-white focus:outline-none focus:border-emerald-500"
            value={valor}
            onChange={e => setValor(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Razón de la corrección</label>
          <input
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            placeholder="Error de digitación, corrección manual..."
            value={nota}
            onChange={e => setNota(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onCerrar} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm transition-colors">Cancelar</button>
          <button onClick={guardar} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">Guardar</button>
        </div>
      </div>
    </div>
  )
}
