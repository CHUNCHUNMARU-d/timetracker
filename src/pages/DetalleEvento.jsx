import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../db'
import ImportarCSV from '../components/ImportarCSV'
import StatusBadge from '../components/StatusBadge'
import ModalAtleta from '../components/ModalAtleta'
import PhaseBadge from '../components/ui/PhaseBadge'
import PhaseStrip from '../components/ui/PhaseStrip'
import PhaseConfirmModal from '../components/ui/PhaseConfirmModal'
import NeonButton from '../components/ui/NeonButton'
import { uid } from '../utils/tiempo'
import { esEditable, esTerminada, puedeTransicionar } from '../utils/estado'

const TABS = ['Atletas', 'Cronometraje', 'Resultados', 'Configuración']

export default function DetalleEvento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [evento, setEvento] = useState(null)
  const [atletas, setAtletas] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [modalAtleta, setModalAtleta] = useState(null)
  const [mostrarCSV, setMostrarCSV] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [configInicio, setConfigInicio] = useState({ inicioTipo: 'unico', horaInicio: null, olas: [] })
  const [guardando, setGuardando] = useState(false)
  const [transicion, setTransicion] = useState(null) // { desde, hasta }

  const eventoId = Number(id)
  const editable = esEditable(evento)
  const terminada = esTerminada(evento)

  async function cargar() {
    const ev = await db.eventos.get(eventoId)
    setEvento(ev)
    const a = await db.atletas.where('eventoId').equals(eventoId).toArray()
    setAtletas(a)
  }

  useEffect(() => { cargar() }, [eventoId])

  useEffect(() => {
    if (evento) {
      setCategorias(evento.categorias ?? [])
      setConfigInicio(evento.configuracion ?? { inicioTipo: 'unico', horaInicio: null })
    }
  }, [evento])

  async function confirmarTransicion() {
    if (!transicion) return
    const check = puedeTransicionar(evento, atletas, transicion.desde, transicion.hasta)
    if (!check.ok) return
    await db.eventos.update(eventoId, { estado: transicion.hasta })
    setEvento(p => ({ ...p, estado: transicion.hasta }))
    setTransicion(null)
  }

  async function guardarAtleta(atleta) {
    const dorsal = String(atleta.dorsal ?? '').trim()
    try {
      const colision = await db.atletas
        .where('[eventoId+dorsal]')
        .equals([eventoId, dorsal])
        .first()
      if (colision && colision.id !== atleta.id) {
        alert(`El dorsal ${dorsal} ya está asignado a ${colision.nombre} ${colision.apellido}`)
        return
      }
      const payload = { ...atleta, dorsal, status: atleta.status ?? 'activo' }
      if (atleta.id) {
        await db.atletas.update(atleta.id, payload)
      } else {
        await db.atletas.add({ ...payload, eventoId })
      }
    } catch (err) {
      alert(`No se pudo guardar atleta: ${err.message ?? err}`)
      return
    }
    setModalAtleta(null)
    cargar()
  }

  function agregarCategoria() {
    setCategorias(p => [...p, { id: uid(), nombre: '', genero: 'M', edadMin: null, edadMax: null }])
  }
  function actualizarCategoria(id, campo, valor) {
    setCategorias(p => p.map(c => c.id === id ? { ...c, [campo]: valor } : c))
  }
  function eliminarCategoria(id) {
    setCategorias(p => p.filter(c => c.id !== id))
  }

  function agregarOlaEnCategoria(catId) {
    setCategorias(p => p.map(c => c.id !== catId ? c : {
      ...c,
      olas: [...(c.olas ?? []), { id: uid(), nombre: `Ola ${(c.olas ?? []).length + 1}`, horaProgramada: '' }],
    }))
  }
  function actualizarOlaEnCategoria(catId, olaId, campo, valor) {
    setCategorias(p => p.map(c => c.id !== catId ? c : {
      ...c,
      olas: c.olas.map(o => o.id === olaId ? { ...o, [campo]: valor } : o),
    }))
  }
  function eliminarOlaEnCategoria(catId, olaId) {
    setCategorias(p => p.map(c => c.id !== catId ? c : {
      ...c,
      olas: c.olas.filter(o => o.id !== olaId),
    }))
  }

  async function guardarConfig() {
    setGuardando(true)
    await db.eventos.update(eventoId, { categorias, configuracion: configInicio })
    setEvento(p => ({ ...p, categorias, configuracion: configInicio }))
    setGuardando(false)
  }

  async function eliminarAtleta(atletaId) {
    if (!confirm('¿Eliminar atleta?')) return
    try {
      await db.atletas.delete(atletaId)
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message ?? err}`)
      return
    }
    setAtletas(p => p.filter(a => a.id !== atletaId))
  }

  async function cambiarStatus(atletaId, status) {
    try {
      await db.atletas.update(atletaId, { status })
    } catch (err) {
      alert(`No se pudo actualizar: ${err.message ?? err}`)
      return
    }
    setAtletas(p => p.map(a => a.id === atletaId ? { ...a, status } : a))
  }

  if (!evento) return (
    <div className="min-h-screen bg-bg flex items-center justify-center text-text-mid font-display uppercase tracking-widest text-sm">
      Cargando…
    </div>
  )

  const atletasFiltrados = atletas.filter(a =>
    !busqueda ||
    a.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.apellido?.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.dorsal?.includes(busqueda)
  )

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-surface border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/')}
            className="text-text-mid hover:text-text-hi text-xs font-display uppercase tracking-widest mb-3 transition-colors"
          >
            ← Inicio
          </button>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <PhaseBadge estado={evento.estado} />
                <span className="font-mono text-[10px] text-text-lo">
                  #{String(evento.id).padStart(4, '0')} · {evento.tipo}
                </span>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-text-hi truncate">
                {evento.nombre}
              </h1>
              <p className="text-text-mid text-sm mt-1">{evento.lugar} · {evento.fecha}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`/pantalla/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-bg border border-border-hi hover:border-activa hover:text-activa text-text-mid font-display text-xs uppercase tracking-widest transition-colors focus-ring-activa"
              >
                📺 Abrir Pantalla
                <span className="opacity-60" aria-hidden="true">↗</span>
              </a>
              {!terminada && (
                <NeonButton
                  variant="primary"
                  size="md"
                  onClick={() => navigate(`/eventos/${id}/timing`)}
                >
                  ⏱ Cronometrar
                </NeonButton>
              )}
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-0 mt-5 border-b border-border" aria-label="Secciones">
            {TABS.map((t, i) => {
              const active = tab === i
              return (
                <button
                  key={t}
                  onClick={() => {
                    setTab(i)
                    if (i === 1) navigate(`/eventos/${id}/timing`)
                    if (i === 2) navigate(`/eventos/${id}/resultados`)
                  }}
                  className={`px-4 py-2.5 text-xs font-display uppercase tracking-widest transition-colors border-b-2 -mb-px ${active ? 'border-activa text-activa' : 'border-transparent text-text-lo hover:text-text-hi'}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {t}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {/* Lifecycle */}
        <PhaseStrip
          evento={evento}
          atletas={atletas}
          onAvanzar={(hasta) => setTransicion({ desde: evento.estado, hasta })}
        />

        {/* Atletas tab */}
        {tab === 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                className="flex-1 min-w-[200px] bg-surface border border-border focus:border-activa px-3 py-2.5 text-text-hi text-sm focus:outline-none transition-colors"
                placeholder="Buscar por nombre o dorsal…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              {editable && (
                <>
                  <NeonButton variant="ghost" size="md" onClick={() => setModalAtleta({})}>
                    + Atleta
                  </NeonButton>
                  <NeonButton variant="ghost" size="md" onClick={() => setMostrarCSV(p => !p)}>
                    📂 CSV
                  </NeonButton>
                </>
              )}
            </div>

            {!editable && (
              <div className="border border-border bg-surface px-4 py-3 text-text-mid text-xs font-display uppercase tracking-wider">
                🔒 Edición bloqueada — solo en fase Preparación
              </div>
            )}

            {mostrarCSV && editable && (
              <div className="bg-surface p-5 border border-border">
                <ImportarCSV
                  eventoId={eventoId}
                  evento={evento}
                  categorias={evento.categorias ?? []}
                  distancias={evento.distancias ?? []}
                  onImportado={() => { setMostrarCSV(false); cargar() }}
                />
              </div>
            )}

            <p className="font-mono text-xs text-text-lo uppercase tracking-wider">
              {atletas.length} atletas registrados
            </p>

            {atletasFiltrados.length === 0 ? (
              <div className="text-center py-16 border border-border bg-surface">
                <p className="font-display uppercase tracking-widest text-text-mid">Sin atletas</p>
                <p className="text-text-lo text-xs mt-1">
                  {editable ? 'Importa un CSV o agrega manualmente' : 'No hay atletas registrados'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface text-text-lo font-display uppercase tracking-widest text-[11px]">
                    <tr>
                      <th scope="col" className="px-4 py-3">Dorsal</th>
                      <th scope="col" className="px-4 py-3">Nombre</th>
                      <th scope="col" className="px-4 py-3 hidden sm:table-cell">Categoría</th>
                      <th scope="col" className="px-4 py-3 hidden sm:table-cell">Ola</th>
                      <th scope="col" className="px-4 py-3">Estado</th>
                      <th scope="col" className="px-4 py-3 hidden md:table-cell">Email</th>
                      <th scope="col" className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {atletasFiltrados.map(a => {
                      const cat = evento.categorias?.find(c => c.id === a.categoriaId)
                      const ola = cat?.olas?.find(o => o.id === a.olaId)
                      const status = a.status ?? 'activo'
                      return (
                        <tr key={a.id} className="border-t border-border hover:bg-elevated/50 text-text-mid">
                          <td className="px-4 py-3 font-mono font-bold text-text-hi">{a.dorsal}</td>
                          <td className="px-4 py-3 text-text-hi">
                            {a.nombre} {a.apellido}
                            {status !== 'activo' && <span className="ml-2"><StatusBadge status={status} /></span>}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-text-mid">{cat?.nombre ?? '—'}</td>
                          <td className="px-4 py-3 hidden sm:table-cell text-text-mid">{ola?.nombre ?? '—'}</td>
                          <td className="px-4 py-3">
                            <select
                              value={status}
                              disabled={terminada}
                              onChange={e => cambiarStatus(a.id, e.target.value)}
                              aria-label={`Estado de ${a.nombre} ${a.apellido}`}
                              className="bg-bg border border-border focus:border-activa px-2 py-1 text-xs text-text-hi focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <option value="activo">Activo</option>
                              <option value="dns">DNS</option>
                              <option value="dnf">DNF</option>
                              <option value="dsq">DSQ</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-text-lo">{a.email || '—'}</td>
                          <td className="px-4 py-3">
                            {editable && (
                              <div className="flex gap-2">
                                <button onClick={() => setModalAtleta(a)} className="text-text-lo hover:text-text-hi transition-colors text-xs" aria-label="Editar">✏️</button>
                                <button onClick={() => eliminarAtleta(a.id)} className="text-text-lo hover:text-danger transition-colors text-xs" aria-label="Eliminar">✕</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Configuración tab */}
        {tab === 3 && (
          <section className="space-y-6">
            {!editable && (
              <div className="border border-border bg-surface px-4 py-3 text-text-mid text-xs font-display uppercase tracking-wider">
                🔒 Configuración bloqueada — solo en fase Preparación
              </div>
            )}

            {/* Tipo de inicio */}
            <div className="bg-surface p-5 border border-border space-y-4">
              <h2 className="font-display text-xs uppercase tracking-widest text-text-lo">Tipo de inicio</h2>
              <div className="flex gap-3">
                {['unico', 'olas'].map(tipo => {
                  const sel = configInicio.inicioTipo === tipo
                  return (
                    <button
                      key={tipo}
                      onClick={() => editable && setConfigInicio(p => ({ ...p, inicioTipo: tipo }))}
                      disabled={!editable}
                      className={`flex-1 py-3 border font-display uppercase tracking-widest text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${sel ? 'border-activa text-activa glow-activa' : 'border-border text-text-mid hover:border-border-hi'}`}
                    >
                      {tipo === 'unico' ? '🚀 Salida única' : '🌊 Por olas'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Categorías con olas anidadas */}
            <div className="space-y-3">
              <h2 className="font-display text-xs uppercase tracking-widest text-text-lo">Categorías</h2>
              {categorias.map(c => (
                <div key={c.id} className="bg-surface border border-border p-4 space-y-3">
                  <div className="grid grid-cols-[1fr_70px_60px_60px_28px] gap-2 items-center">
                    <input
                      className="bg-bg border border-border focus:border-activa px-3 py-2 text-text-hi text-sm focus:outline-none disabled:opacity-40"
                      placeholder="M 30-34"
                      disabled={!editable}
                      value={c.nombre}
                      onChange={e => actualizarCategoria(c.id, 'nombre', e.target.value)}
                    />
                    <select
                      className="bg-bg border border-border focus:border-activa px-2 py-2 text-text-hi text-sm focus:outline-none disabled:opacity-40"
                      disabled={!editable}
                      value={c.genero}
                      onChange={e => actualizarCategoria(c.id, 'genero', e.target.value)}
                    >
                      <option value="M">M</option>
                      <option value="F">F</option>
                      <option value="X">X</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Edad mín"
                      className="bg-bg border border-border focus:border-activa px-2 py-2 text-text-hi text-sm focus:outline-none disabled:opacity-40"
                      disabled={!editable}
                      value={c.edadMin ?? ''}
                      onChange={e => actualizarCategoria(c.id, 'edadMin', e.target.value === '' ? null : Number(e.target.value))}
                    />
                    <input
                      type="number"
                      placeholder="Edad máx"
                      className="bg-bg border border-border focus:border-activa px-2 py-2 text-text-hi text-sm focus:outline-none disabled:opacity-40"
                      disabled={!editable}
                      value={c.edadMax ?? ''}
                      onChange={e => actualizarCategoria(c.id, 'edadMax', e.target.value === '' ? null : Number(e.target.value))}
                    />
                    <button
                      onClick={() => eliminarCategoria(c.id)}
                      className="text-text-lo hover:text-danger transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={!editable || categorias.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                  {(c.olas ?? []).map(ola => (
                    <div key={ola.id} className="flex gap-2 items-center pl-3 border-l-2 border-border">
                      <input
                        className="flex-1 bg-bg border border-border focus:border-activa px-3 py-1.5 text-text-hi text-sm focus:outline-none disabled:opacity-40"
                        placeholder="Nombre de ola"
                        disabled={!editable}
                        value={ola.nombre}
                        onChange={e => actualizarOlaEnCategoria(c.id, ola.id, 'nombre', e.target.value)}
                      />
                      <input
                        type="time"
                        className="bg-bg border border-border focus:border-activa px-3 py-1.5 text-text-hi text-sm focus:outline-none disabled:opacity-40"
                        disabled={!editable}
                        value={ola.horaProgramada ?? ''}
                        onChange={e => actualizarOlaEnCategoria(c.id, ola.id, 'horaProgramada', e.target.value)}
                      />
                      <button
                        onClick={() => eliminarOlaEnCategoria(c.id, ola.id)}
                        disabled={!editable}
                        className="text-text-lo hover:text-danger transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {editable && (
                    <button
                      onClick={() => agregarOlaEnCategoria(c.id)}
                      className="text-text-mid hover:text-activa text-xs font-display uppercase tracking-widest transition-colors pl-1"
                    >
                      + ola
                    </button>
                  )}
                </div>
              ))}
              {editable && (
                <button
                  onClick={agregarCategoria}
                  className="text-activa hover:text-text-hi text-sm font-display uppercase tracking-widest transition-colors"
                >
                  + Categoría
                </button>
              )}
            </div>

            {editable && (
              <NeonButton
                variant="primary"
                size="lg"
                onClick={guardarConfig}
                disabled={guardando}
                className="w-full"
              >
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </NeonButton>
            )}
          </section>
        )}
      </div>

      {/* Modals */}
      {modalAtleta && (
        <ModalAtleta
          atleta={modalAtleta}
          categorias={evento.categorias ?? []}
          onGuardar={guardarAtleta}
          onCerrar={() => setModalAtleta(null)}
        />
      )}

      {transicion && (
        <PhaseConfirmModal
          evento={evento}
          atletas={atletas}
          desde={transicion.desde}
          hasta={transicion.hasta}
          onConfirm={confirmarTransicion}
          onCancel={() => setTransicion(null)}
        />
      )}
    </div>
  )
}
