import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../db'
import { msAHora, ahora } from '../utils/tiempo'
import { emitirActualizacion, escucharActualizaciones } from '../utils/sync'
import { registrarPaso } from '../utils/registrarPaso'
import { puedeTransicionar, esTerminada } from '../utils/estado'
import RaceClock from '../components/ui/RaceClock'
import BibTally from '../components/ui/BibTally'
import StopGate from '../components/ui/StopGate'
import NeonButton from '../components/ui/NeonButton'
import PhaseBadge from '../components/ui/PhaseBadge'

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
  const [horaFin, setHoraFin] = useState(null)
  const [pausadoEn, setPausadoEn] = useState(null)
  const [totalPausado, setTotalPausado] = useState(0)
  const [confirmandoPausa, setConfirmandoPausa] = useState(false)
  const [flash, setFlash] = useState(null)
  const [modalEditar, setModalEditar] = useState(null)
  const [reloj, setReloj] = useState(0)
  const inputRef = useRef()

  const terminada = esTerminada(evento)

  useEffect(() => {
    async function cargar() {
      const ev = await db.eventos.get(eventoId)
      setEvento(ev)
      if (ev?.configuracion?.horaInicio) setHoraInicioGlobal(ev.configuracion.horaInicio)
      if (ev?.configuracion?.horaFin) setHoraFin(ev.configuracion.horaFin)
      if (ev?.configuracion?.olaActiva) setOlaActiva(ev.configuracion.olaActiva)
      if (ev?.configuracion?.pausadoEn) setPausadoEn(ev.configuracion.pausadoEn)
      if (ev?.configuracion?.totalPausado) setTotalPausado(ev.configuracion.totalPausado)
      const a = await db.atletas.where('eventoId').equals(eventoId).toArray()
      setAtletas(a)
      const t = await db.tiempos.where('eventoId').equals(eventoId).toArray()
      setTiempos(t)
    }
    cargar()
  }, [eventoId])

  // Live clock — runs only while the race is active and not paused
  useEffect(() => {
    if (!horaInicioGlobal || terminada) return
    const interval = setInterval(() => {
      if (pausadoEn) { setReloj(pausadoEn - horaInicioGlobal - totalPausado); return }
      setReloj(Date.now() - horaInicioGlobal - totalPausado)
    }, 500)
    return () => clearInterval(interval)
  }, [horaInicioGlobal, pausadoEn, totalPausado, terminada])

  // Auto-cancel pausa confirmation after 4s
  useEffect(() => {
    if (!confirmandoPausa) return
    const t = setTimeout(() => setConfirmandoPausa(false), 4000)
    return () => clearTimeout(t)
  }, [confirmandoPausa])

  // Auto focus input on load
  useEffect(() => { if (!terminada) inputRef.current?.focus() }, [evento, terminada])

  // Cross-tab refresh: when /scan (or any other tab) writes, re-read evento +
  // tiempos so the results list and phase state in this tab stay current.
  useEffect(() => {
    if (!eventoId) return
    return escucharActualizaciones(async ({ eventoId: srcId }) => {
      if (srcId !== eventoId) return
      const [ev, t] = await Promise.all([
        db.eventos.get(eventoId),
        db.tiempos.where('eventoId').equals(eventoId).toArray(),
      ])
      if (ev) {
        setEvento(ev)
        if (ev.configuracion?.pausadoEn !== undefined) setPausadoEn(ev.configuracion.pausadoEn)
        if (ev.configuracion?.totalPausado !== undefined) setTotalPausado(ev.configuracion.totalPausado ?? 0)
        if (ev.configuracion?.horaInicio) setHoraInicioGlobal(ev.configuracion.horaInicio)
        if (ev.configuracion?.horaFin) setHoraFin(ev.configuracion.horaFin)
      }
      setTiempos(t)
    })
  }, [eventoId])

  const esOlas = evento?.configuracion?.inicioTipo === 'olas'
  const carreraIniciada = esOlas ? !!olaActiva : !!horaInicioGlobal

  // Frozen race time, computed once when finalized
  const tiempoFinal = useMemo(() => {
    if (!horaFin || !horaInicioGlobal) return null
    return horaFin - horaInicioGlobal - (totalPausado ?? 0)
  }, [horaFin, horaInicioGlobal, totalPausado])

  function showFlash(payload, ms = 2500) {
    setFlash(payload)
    setTimeout(() => setFlash(null), ms)
  }

  async function iniciarCarrera() {
    // Race-day safety gate
    const check = puedeTransicionar(evento, atletas, 'preparacion', 'activa')
    if (!check.ok) {
      showFlash({ error: check.motivo }, 4000)
      return
    }
    const hora = ahora()
    try {
      await db.eventos.update(eventoId, {
        configuracion: { ...evento.configuracion, horaInicio: hora },
        estado: 'activa',
      })
    } catch (err) {
      showFlash({ error: `No se pudo iniciar: ${err.message ?? err}` }, 4000)
      return
    }
    setHoraInicioGlobal(hora)
    setEvento(p => ({ ...p, configuracion: { ...p.configuracion, horaInicio: hora }, estado: 'activa' }))
    inputRef.current?.focus()
  }

  async function pausar() {
    const ts = Date.now()
    try {
      await db.eventos.update(eventoId, { configuracion: { ...evento.configuracion, pausadoEn: ts, totalPausado } })
    } catch (err) {
      showFlash({ error: `No se pudo pausar: ${err.message ?? err}` }, 4000)
      return
    }
    setPausadoEn(ts)
    setConfirmandoPausa(false)
    setEvento(p => ({ ...p, configuracion: { ...p.configuracion, pausadoEn: ts, totalPausado } }))
    inputRef.current?.blur()
  }

  async function reanudar() {
    const adicional = Date.now() - pausadoEn
    const nuevoTotal = totalPausado + adicional
    try {
      await db.eventos.update(eventoId, { configuracion: { ...evento.configuracion, pausadoEn: null, totalPausado: nuevoTotal } })
    } catch (err) {
      showFlash({ error: `No se pudo reanudar: ${err.message ?? err}` }, 4000)
      return
    }
    setTotalPausado(nuevoTotal)
    setPausadoEn(null)
    setEvento(p => ({ ...p, configuracion: { ...p.configuracion, pausadoEn: null, totalPausado: nuevoTotal } }))
    inputRef.current?.focus()
  }

  // Stop = freeze the race. No auto-nav — operator chooses next action
  // from the post-race panel.
  async function detener() {
    const fin = ahora()
    try {
      await db.eventos.update(eventoId, {
        estado: 'terminada',
        configuracion: { ...evento.configuracion, horaFin: fin, pausadoEn: null },
      })
    } catch (err) {
      showFlash({ error: `No se pudo finalizar: ${err.message ?? err}` }, 4000)
      return
    }
    setHoraFin(fin)
    setPausadoEn(null)
    setEvento(p => ({ ...p, estado: 'terminada', configuracion: { ...p.configuracion, horaFin: fin, pausadoEn: null } }))
    emitirActualizacion(eventoId)
  }

  async function iniciarOla(categoriaId, olaId) {
    const nuevoActiva = { categoriaId, olaId }
    const cat = evento.categorias?.find(c => c.id === categoriaId)
    const ola = cat?.olas?.find(o => o.id === olaId)

    if (ola?.horaInicio) {
      try {
        await db.eventos.update(eventoId, {
          configuracion: { ...evento.configuracion, olaActiva: nuevoActiva },
        })
      } catch (err) {
        showFlash({ error: `No se pudo cambiar ola: ${err.message ?? err}` }, 4000)
        return
      }
      setOlaActiva(nuevoActiva)
      setEvento(p => ({ ...p, configuracion: { ...p.configuracion, olaActiva: nuevoActiva } }))
      inputRef.current?.focus()
      return
    }

    // First ola start — gate the phase transition too
    if (evento.estado === 'preparacion') {
      const check = puedeTransicionar(evento, atletas, 'preparacion', 'activa')
      if (!check.ok) { showFlash({ error: check.motivo }, 4000); return }
    }

    const hora = ahora()
    const categorias = evento.categorias.map(c => {
      if (c.id !== categoriaId) return c
      return { ...c, olas: c.olas.map(o => o.id === olaId ? { ...o, horaInicio: hora } : o) }
    })
    try {
      await db.eventos.update(eventoId, {
        categorias,
        configuracion: { ...evento.configuracion, horaInicio: horaInicioGlobal ?? hora, olaActiva: nuevoActiva },
        estado: 'activa',
      })
    } catch (err) {
      showFlash({ error: `No se pudo iniciar ola: ${err.message ?? err}` }, 4000)
      return
    }
    setOlaActiva(nuevoActiva)
    if (!horaInicioGlobal) setHoraInicioGlobal(hora)
    setEvento(p => ({ ...p, categorias, configuracion: { ...p.configuracion, olaActiva: nuevoActiva }, estado: 'activa' }))
    inputRef.current?.focus()
  }

  async function registrarDorsal() {
    if (terminada) return
    const d = dorsal.trim()
    if (!d) return
    setDorsal('')

    const res = await registrarPaso({
      eventoId,
      dorsal: d,
      evento,
      atletas,
      tiempos,
      olaActiva,
      horaInicioGlobal,
      totalPausado,
      pausadoEn,
      esOlas,
    })

    if (res.ok) {
      setTiempos(p => [res.registro, ...p])
      showFlash({
        nombre: res.atleta ? `${res.atleta.nombre} ${res.atleta.apellido}` : `Dorsal ${res.registro.dorsal}`,
        tiempo: msAHora(res.registro.tiempoNeto),
        desconocido: !res.atleta,
      }, 3000)
      inputRef.current?.focus()
      return
    }

    switch (res.code) {
      case 'PAUSADA':
        showFlash({ error: 'Carrera en pausa — reanuda antes de registrar' })
        break
      case 'NO_INICIADA':
        showFlash({ error: 'Primero inicia la carrera o una ola' })
        break
      case 'DUPLICADO':
        showFlash({ error: `Dorsal ${res.dorsal} ya registrado (${res.atleta?.nombre ?? ''})` })
        break
      case 'CATEGORIA_INCORRECTA':
        showFlash({ error: `Dorsal ${res.dorsal} es de categoría "${res.categoriaCorrecta}"` }, 3000)
        break
      case 'WRITE_FAILED':
        showFlash({ error: `No se pudo guardar: ${res.message}` }, 4000)
        break
      // TERMINADA / VACIO: silent (gated above)
    }
    inputRef.current?.focus()
  }

  async function guardarEdicion({ id: tId, tiempoNeto, notaEdicion }) {
    try {
      await db.tiempos.update(tId, { tiempoNeto, editado: true, notaEdicion })
    } catch (err) {
      alert(`No se pudo guardar: ${err.message ?? err}`)
      return
    }
    setTiempos(p => p.map(t => t.id === tId ? { ...t, tiempoNeto, editado: true, notaEdicion } : t))
    emitirActualizacion(eventoId)
    setModalEditar(null)
  }

  async function eliminarTiempo(tId) {
    if (terminada) return
    if (!confirm('¿Eliminar este registro de tiempo?')) return
    try {
      await db.tiempos.delete(tId)
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message ?? err}`)
      return
    }
    setTiempos(p => p.filter(t => t.id !== tId))
    emitirActualizacion(eventoId)
  }

  if (!evento) return (
    <div className="min-h-screen bg-bg flex items-center justify-center text-text-mid font-display uppercase tracking-widest text-sm">
      Cargando…
    </div>
  )

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <header className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate(`/eventos/${id}`)}
          className="text-text-mid hover:text-text-hi text-xs font-display uppercase tracking-widest transition-colors shrink-0"
        >
          ← {evento.nombre}
        </button>
        <PhaseBadge estado={evento.estado} />
        <div className="flex items-center gap-2 shrink-0">
          {!terminada && (
            <NeonButton variant="ghost" size="sm" as="a" href={`/eventos/${id}/scan`} target="_blank" rel="noopener noreferrer">
              🎯 <span className="hidden sm:inline">Escaneo</span>
            </NeonButton>
          )}
          <NeonButton variant="ghost" size="sm" as="a" href={`/pantalla/${id}`} target="_blank" rel="noopener noreferrer">
            📺 <span className="hidden sm:inline">Pantalla</span>
            <span className="font-mono text-[10px] opacity-60">({tiempos.length})</span>
          </NeonButton>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-6 gap-6 max-w-3xl mx-auto w-full">

        {/* TERMINADA — post-race panel */}
        {terminada && (
          <section className="w-full bg-surface border border-border p-6 md:p-8 space-y-6 text-center">
            <RaceClock value={tiempoFinal ?? 0} state="frozen" label="Tiempo final de carrera" size="xl" />

            <div className="grid grid-cols-3 gap-3 text-center pt-4 border-t border-border">
              <Stat label="Llegadas" value={tiempos.length} />
              <Stat label="Atletas" value={atletas.length} />
              <Stat label="Categorías" value={evento.categorias?.length ?? 0} />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <NeonButton
                variant="primary"
                size="lg"
                as="a"
                href={`/pantalla/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                📺 Abrir Pantalla
                <span className="opacity-60" aria-hidden="true">↗</span>
              </NeonButton>
              <NeonButton
                variant="ghost"
                size="lg"
                onClick={() => navigate(`/eventos/${id}`)}
                className="flex-1"
              >
                ← Volver al evento
              </NeonButton>
            </div>
          </section>
        )}

        {/* PREPARACION / ACTIVA — running race */}
        {!terminada && (
          <>
            {/* Race clock — shown once started */}
            {carreraIniciada && (
              <RaceClock
                value={reloj}
                state={pausadoEn ? 'paused' : 'running'}
                size="lg"
                label={pausadoEn ? 'Carrera pausada' : 'En curso'}
              />
            )}

            {/* Start controls */}
            {!esOlas && !carreraIniciada && (
              <div className="flex flex-col items-center gap-2 mt-4">
                <NeonButton variant="primary" size="xl" onClick={iniciarCarrera}>
                  🚀 Iniciar carrera
                </NeonButton>
                <p className="text-text-lo text-xs font-display uppercase tracking-widest mt-2">
                  Requiere atletas + categorías
                </p>
              </div>
            )}

            {esOlas && (
              <div className="w-full max-w-lg space-y-4">
                {evento.categorias?.filter(c => (c.olas ?? []).length > 0).map(cat => (
                  <div key={cat.id}>
                    <p className="text-text-mid text-xs mb-2 uppercase tracking-[0.3em] font-display">{cat.nombre}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {cat.olas.map(ola => {
                        const iniciada = !!ola.horaInicio
                        const activa = olaActiva?.olaId === ola.id
                        const cls = activa
                          ? 'bg-surface border-activa text-activa glow-activa'
                          : iniciada
                            ? 'bg-surface border-border-hi text-text-hi hover:border-activa'
                            : 'bg-activa border-activa text-bg hover:shadow-glow-activa'
                        return (
                          <button
                            key={ola.id}
                            onClick={() => iniciarOla(cat.id, ola.id)}
                            className={`min-h-[56px] py-3 px-4 border-2 font-display font-bold uppercase tracking-widest text-sm transition-shadow focus-ring-activa ${cls}`}
                          >
                            <div>{activa ? `● ${ola.nombre} · activa` : iniciada ? `✓ ${ola.nombre}` : `▶ Iniciar ${ola.nombre}`}</div>
                            {iniciada && (
                              <div className="font-mono text-xs mt-1 opacity-70 normal-case">
                                {new Date(ola.horaInicio).toLocaleTimeString('es-MX')}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pause / Stop controls */}
            {carreraIniciada && (
              <div className="flex gap-3 flex-wrap justify-center">
                {pausadoEn ? (
                  <NeonButton variant="primary" size="md" onClick={reanudar}>
                    ▶ Reanudar
                  </NeonButton>
                ) : confirmandoPausa ? (
                  <NeonButton variant="prep" size="md" onClick={pausar} className="pulse-1s glow-prep">
                    ¿Confirmar pausa?
                  </NeonButton>
                ) : (
                  <NeonButton variant="prep" size="md" onClick={() => setConfirmandoPausa(true)}>
                    ⏸ Pausar
                  </NeonButton>
                )}
                <StopGate onConfirm={detener} />
              </div>
            )}

            {/* Bib entry */}
            <BibTally
              ref={inputRef}
              value={dorsal}
              onChange={setDorsal}
              onSubmit={registrarDorsal}
              disabled={!carreraIniciada || !!pausadoEn}
              lockReason={
                !carreraIniciada
                  ? 'Inicia la carrera para registrar'
                  : pausadoEn
                    ? 'Pausa activa — reanuda para registrar'
                    : null
              }
            />
          </>
        )}

        {/* Flash feedback */}
        {flash && (
          <div
            role="status"
            aria-live="assertive"
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-4 text-center z-50 min-w-[280px] border-2 ${flash.error ? 'bg-elevated border-danger glow-danger' : flash.desconocido ? 'bg-elevated border-prep glow-prep' : 'bg-elevated border-activa glow-activa'}`}
          >
            {flash.error ? (
              <p className="text-danger font-display font-bold text-base uppercase tracking-wider">
                ✗ {flash.error}
              </p>
            ) : flash.desconocido ? (
              <>
                <p className="text-prep font-display font-bold text-base uppercase tracking-wider">
                  ⚠ {flash.nombre} <span className="opacity-70">(no listado)</span>
                </p>
                <p className="text-prep text-3xl font-mono font-bold mt-1">{flash.tiempo}</p>
                <p className="text-text-lo text-[10px] mt-1 uppercase tracking-widest">Dorsal no encontrado</p>
              </>
            ) : (
              <>
                <p className="text-activa font-display font-bold text-base uppercase tracking-wider">
                  ✓ {flash.nombre}
                </p>
                <p className="text-activa text-3xl font-mono font-bold mt-1">{flash.tiempo}</p>
              </>
            )}
          </div>
        )}
      </main>

      {/* Recent arrivals log */}
      {tiempos.length > 0 && (
        <aside className="border-t border-border max-h-64 overflow-y-auto">
          <div className="px-4 py-2 text-[10px] font-display uppercase tracking-[0.3em] text-text-lo bg-surface">
            Llegadas recientes
          </div>
          {tiempos.slice(0, 20).map(t => {
            const a = atletas.find(at => at.dorsal === t.dorsal)
            return (
              <div key={t.id} className="flex items-center justify-between px-4 py-2 border-t border-border hover:bg-surface/50">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono font-bold text-text-hi w-12 shrink-0">{t.dorsal}</span>
                  <span className="text-text-mid text-sm truncate">
                    {a ? `${a.nombre} ${a.apellido}` : <span className="text-prep text-xs">No registrado</span>}
                  </span>
                  {t.editado && <span className="text-xs text-activa" aria-label="Editado">✏</span>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-activa text-sm">{msAHora(t.tiempoNeto)}</span>
                  {!terminada && (
                    <>
                      <button onClick={() => setModalEditar(t)} className="min-h-[40px] min-w-[40px] text-text-mid hover:text-text-hi text-sm transition-colors" aria-label="Editar">✏️</button>
                      <button onClick={() => eliminarTiempo(t.id)} className="min-h-[40px] min-w-[40px] text-text-mid hover:text-danger text-sm transition-colors" aria-label="Eliminar">✕</button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </aside>
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

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-text-lo text-[10px] font-display uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-mono font-bold text-text-hi">{value}</div>
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-time-title"
      className="fixed inset-0 bg-bg/90 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <div className="bg-elevated border border-border w-full max-w-sm p-6 space-y-4">
        <h3 id="edit-time-title" className="font-display text-base uppercase tracking-widest text-text-hi">
          Editar tiempo · Dorsal {tiempo.dorsal}
        </h3>
        <div>
          <label className="text-[10px] font-display uppercase tracking-widest text-text-lo block mb-1">
            Tiempo (HH:MM:SS)
          </label>
          <input
            className="w-full text-center digits text-3xl bg-bg border border-border focus:border-activa px-3 py-3 text-text-hi focus:outline-none"
            value={valor}
            onChange={e => setValor(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] font-display uppercase tracking-widest text-text-lo block mb-1">
            Razón de la corrección
          </label>
          <input
            className="w-full bg-bg border border-border focus:border-activa px-3 py-2 text-text-hi text-sm focus:outline-none"
            placeholder="Error de digitación, corrección manual…"
            value={nota}
            onChange={e => setNota(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <NeonButton variant="ghost" size="md" onClick={onCerrar} className="flex-1">Cancelar</NeonButton>
          <NeonButton variant="primary" size="md" onClick={guardar} className="flex-1">Guardar</NeonButton>
        </div>
      </div>
    </div>
  )
}
