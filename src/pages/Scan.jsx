import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { db } from '../db'
import { msAHora } from '../utils/tiempo'
import { escucharActualizaciones } from '../utils/sync'
import { registrarPaso } from '../utils/registrarPaso'
import { esTerminada } from '../utils/estado'
import RaceClock from '../components/ui/RaceClock'
import BibTally from '../components/ui/BibTally'
import PhaseBadge from '../components/ui/PhaseBadge'

// Dedicated scan window. Opened in a second browser tab from Timing. The
// Bluetooth/USB barcode scanner pairs to the laptop, this window is the
// always-focused keyboard target. Race state is read from the same Dexie
// database the Timing tab writes to; BroadcastChannel keeps both in sync.
export default function Scan() {
  const { id } = useParams()
  const eventoId = Number(id)

  const [evento, setEvento] = useState(null)
  const [atletas, setAtletas] = useState([])
  const [tiempos, setTiempos] = useState([])
  const [dorsal, setDorsal] = useState('')
  const [recent, setRecent] = useState([]) // [{ id, dorsal, nombre, tiempo }]
  const [flash, setFlash] = useState(null)
  const [reloj, setReloj] = useState(0)
  const inputRef = useRef()

  // Initial load
  useEffect(() => {
    if (!eventoId) return
    let cancelled = false
    async function cargar() {
      const [ev, a, t] = await Promise.all([
        db.eventos.get(eventoId),
        db.atletas.where('eventoId').equals(eventoId).toArray(),
        db.tiempos.where('eventoId').equals(eventoId).toArray(),
      ])
      if (cancelled) return
      setEvento(ev ?? null)
      setAtletas(a)
      setTiempos(t)
    }
    cargar()
    return () => { cancelled = true }
  }, [eventoId])

  // Cross-tab refresh on actualizacion
  useEffect(() => {
    if (!eventoId) return
    return escucharActualizaciones(async ({ eventoId: srcId }) => {
      if (srcId !== eventoId) return
      const [ev, a, t] = await Promise.all([
        db.eventos.get(eventoId),
        db.atletas.where('eventoId').equals(eventoId).toArray(),
        db.tiempos.where('eventoId').equals(eventoId).toArray(),
      ])
      setEvento(ev ?? null)
      setAtletas(a)
      setTiempos(t)
    })
  }, [eventoId])

  const pausadoEn = evento?.configuracion?.pausadoEn ?? null
  const horaInicioGlobal = evento?.configuracion?.horaInicio ?? null
  const totalPausado = evento?.configuracion?.totalPausado ?? 0
  const olaActiva = evento?.configuracion?.olaActiva ?? null
  const esOlas = evento?.configuracion?.inicioTipo === 'olas'
  const terminada = esTerminada(evento)
  const carreraIniciada = esOlas ? !!olaActiva : !!horaInicioGlobal
  const puedeEscanear = evento?.estado === 'activa' && !pausadoEn && carreraIniciada

  // Live clock — same shape as Timing
  useEffect(() => {
    if (!horaInicioGlobal || terminada) return
    const interval = setInterval(() => {
      if (pausadoEn) { setReloj(pausadoEn - horaInicioGlobal - totalPausado); return }
      setReloj(Date.now() - horaInicioGlobal - totalPausado)
    }, 500)
    return () => clearInterval(interval)
  }, [horaInicioGlobal, pausadoEn, totalPausado, terminada])

  // Always-focused input: refocus on mount and after every render where it
  // becomes available again.
  useEffect(() => {
    if (puedeEscanear) inputRef.current?.focus()
  }, [puedeEscanear])

  function showFlash(payload, ms = 2500) {
    setFlash(payload)
    setTimeout(() => setFlash(null), ms)
  }

  async function onSubmitDorsal() {
    const d = dorsal.trim()
    if (!d) return
    setDorsal('')

    const res = await registrarPaso({
      eventoId,
      dorsal: d,
      evento,
      atletas,
      tiempos,
      horaInicioGlobal,
      totalPausado,
      pausadoEn,
      esOlas,
    })

    if (res.ok) {
      setTiempos(p => [res.registro, ...p])
      const nombre = res.atleta ? `${res.atleta.nombre} ${res.atleta.apellido}` : `Dorsal ${res.registro.dorsal}`
      setRecent(p => [
        { id: res.registro.id, dorsal: res.registro.dorsal, nombre, tiempo: msAHora(res.registro.tiempoNeto), desconocido: !res.atleta },
        ...p,
      ].slice(0, 5))
      showFlash({
        nombre,
        tiempo: msAHora(res.registro.tiempoNeto),
        desconocido: !res.atleta,
      }, 2000)
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
      case 'OLA_NO_INICIADA':
        showFlash({ error: `${res.ola} aún no inicia (dorsal ${res.dorsal})` }, 3000)
        break
      case 'WRITE_FAILED':
        showFlash({ error: `No se pudo guardar: ${res.message}` }, 4000)
        break
    }
    inputRef.current?.focus()
  }

  // Page-wide click refocuses the input — guards against losing the scanner
  // wedge if the operator clicks an empty area of the page.
  function refocusInput() {
    if (puedeEscanear) inputRef.current?.focus()
  }

  if (!evento) return (
    <div className="min-h-screen bg-bg flex items-center justify-center text-text-mid font-display uppercase tracking-widest text-sm">
      Cargando…
    </div>
  )

  const lockReason = terminada
    ? 'Carrera terminada'
    : !carreraIniciada
      ? 'Inicia la carrera en la ventana de Timing'
      : pausadoEn
        ? 'Carrera en pausa'
        : null

  return (
    <div className="min-h-screen bg-bg flex flex-col" onClick={refocusInput}>
      <header className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-text-mid text-xs font-display uppercase tracking-widest shrink-0">
          🎯 Escaneo · {evento.nombre}
        </div>
        <PhaseBadge estado={evento.estado} />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); window.close() }}
          className="px-3 py-2 min-h-[40px] bg-bg border border-border-hi hover:border-danger hover:text-danger text-text-mid font-display text-[11px] uppercase tracking-widest transition-colors focus-ring-activa shrink-0"
        >
          ✕ Cerrar
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-6 gap-6 max-w-2xl mx-auto w-full">
        {carreraIniciada && !terminada && (
          <RaceClock
            value={reloj}
            state={pausadoEn ? 'paused' : 'running'}
            size="lg"
            label={pausadoEn ? 'Carrera pausada' : 'En curso'}
          />
        )}

        {puedeEscanear ? (
          <BibTally
            ref={inputRef}
            value={dorsal}
            onChange={setDorsal}
            onSubmit={onSubmitDorsal}
          />
        ) : (
          <div
            role="status"
            aria-live="polite"
            className="w-full max-w-sm border-2 border-prep bg-elevated px-6 py-8 text-center"
          >
            <div className="text-prep font-display text-base uppercase tracking-wider">
              🔒 {lockReason}
            </div>
            <p className="text-text-lo text-[11px] uppercase tracking-widest font-display mt-3">
              La ventana de Timing controla la carrera
            </p>
          </div>
        )}

        <aside data-testid="recent-scans" className="w-full max-w-sm" aria-label="Últimas lecturas">
          <div className="text-text-lo text-[10px] font-display uppercase tracking-[0.3em] mb-2">
            Últimas 5 lecturas
          </div>
          {recent.length === 0 ? (
            <div className="text-text-lo text-xs font-display uppercase tracking-widest text-center py-6 border border-dashed border-border">
              Esperando primer escaneo…
            </div>
          ) : (
            <ul className="border border-border divide-y divide-border">
              {recent.map(r => (
                <li key={r.id} className="flex items-center justify-between px-3 py-2 bg-surface">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-bold text-text-hi w-12 shrink-0">{r.dorsal}</span>
                    <span className={`text-sm truncate ${r.desconocido ? 'text-prep' : 'text-text-mid'}`}>
                      {r.desconocido ? `${r.nombre} (no listado)` : r.nombre}
                    </span>
                  </div>
                  <span className="font-mono text-activa text-sm shrink-0">{r.tiempo}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>

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
    </div>
  )
}
