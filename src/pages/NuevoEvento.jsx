import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { uid } from '../utils/tiempo'
import NeonButton from '../components/ui/NeonButton'

const TIPOS = ['triatlón', 'duatlón', 'carrera', 'ciclismo', 'otro']
const PASOS = ['Información', 'Distancias', 'Categorías', 'Inicio']

export default function NuevoEvento() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState(0)

  const [info, setInfo] = useState({ nombre: '', fecha: '', lugar: '', tipo: 'triatlón' })
  const [distancias, setDistancias] = useState([
    { id: uid(), nombre: 'Sprint' },
    { id: uid(), nombre: 'Olímpico' },
  ])
  const [categorias, setCategorias] = useState([
    { id: uid(), nombre: 'M 30-34', genero: 'M', edadMin: 30, edadMax: 34, olas: [] },
    { id: uid(), nombre: 'F 30-34', genero: 'F', edadMin: 30, edadMax: 34, olas: [] },
  ])
  const [configInicio, setConfigInicio] = useState({ inicioTipo: 'unico', horaInicio: null })

  function agregarDistancia() { setDistancias(p => [...p, { id: uid(), nombre: '' }]) }
  function actualizarDistancia(id, nombre) { setDistancias(p => p.map(d => d.id === id ? { ...d, nombre } : d)) }
  function eliminarDistancia(id) { setDistancias(p => p.filter(d => d.id !== id)) }

  function agregarCategoria() {
    setCategorias(p => [...p, { id: uid(), nombre: '', genero: 'M', edadMin: null, edadMax: null }])
  }
  function actualizarCategoria(id, campo, valor) {
    setCategorias(p => p.map(c => c.id === id ? { ...c, [campo]: valor } : c))
  }
  function eliminarCategoria(id) { setCategorias(p => p.filter(c => c.id !== id)) }

  function agregarOlaEnCategoria(catId) {
    setCategorias(p => p.map(c => c.id !== catId ? c : {
      ...c,
      olas: [...(c.olas ?? []), { id: uid(), nombre: `Ola ${(c.olas ?? []).length + 1}`, horaProgramada: '' }],
    }))
  }
  function actualizarOlaEnCategoria(catId, olaId, campo, valor) {
    setCategorias(p => p.map(c => c.id !== catId ? c : {
      ...c, olas: c.olas.map(o => o.id === olaId ? { ...o, [campo]: valor } : o),
    }))
  }
  function eliminarOlaEnCategoria(catId, olaId) {
    setCategorias(p => p.map(c => c.id !== catId ? c : {
      ...c, olas: c.olas.filter(o => o.id !== olaId),
    }))
  }

  async function guardar() {
    const evento = {
      nombre: info.nombre,
      fecha: info.fecha,
      lugar: info.lugar,
      tipo: info.tipo,
      estado: 'preparacion',
      distancias,
      categorias,
      configuracion: configInicio,
    }
    const id = await db.eventos.add(evento)
    navigate(`/eventos/${id}`)
  }

  const puedeAvanzar = () => {
    if (paso === 0) return info.nombre && info.fecha && info.lugar
    if (paso === 1) return distancias.length > 0 && distancias.every(d => d.nombre.trim())
    if (paso === 2) return categorias.length > 0 && categorias.every(c => c.nombre.trim())
    return true
  }

  return (
    <div className="min-h-screen bg-bg bg-grid">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <button
          onClick={() => navigate('/')}
          className="text-text-mid hover:text-text-hi text-xs font-display uppercase tracking-widest mb-6 transition-colors"
        >
          ← Volver
        </button>

        <p className="font-display text-[10px] uppercase tracking-[0.4em] text-text-lo mb-2">
          Nuevo registro
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-text-hi mb-8">
          Crear evento
        </h1>

        {/* Stepper */}
        <ol className="flex items-center gap-2 mb-8 text-[10px] font-display uppercase tracking-widest" aria-label="Pasos">
          {PASOS.map((p, i) => (
            <li key={p} className="flex items-center gap-2">
              <span className={`w-7 h-7 flex items-center justify-center border ${i <= paso ? 'border-activa text-activa' : 'border-border text-text-lo'} font-bold`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className={`hidden sm:block ${i === paso ? 'text-text-hi' : 'text-text-lo'}`}>{p}</span>
              {i < PASOS.length - 1 && <span className={`h-px w-6 ${i < paso ? 'bg-activa' : 'bg-border'}`} aria-hidden="true" />}
            </li>
          ))}
        </ol>

        <div className="bg-surface border border-border p-6">
          {/* Paso 0: Información */}
          {paso === 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-xs uppercase tracking-widest text-text-lo mb-3">Información</h2>
              <div>
                <label className="block text-[10px] font-display uppercase tracking-widest text-text-lo mb-1">Nombre *</label>
                <input
                  className="w-full bg-bg border border-border focus:border-activa px-3 py-2.5 text-text-hi focus:outline-none transition-colors"
                  placeholder="Triatlón San Cristóbal 2026"
                  value={info.nombre}
                  onChange={e => setInfo(p => ({ ...p, nombre: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-display uppercase tracking-widest text-text-lo mb-1">Fecha *</label>
                  <input
                    type="date"
                    className="w-full bg-bg border border-border focus:border-activa px-3 py-2.5 text-text-hi focus:outline-none transition-colors"
                    value={info.fecha}
                    onChange={e => setInfo(p => ({ ...p, fecha: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display uppercase tracking-widest text-text-lo mb-1">Lugar *</label>
                  <input
                    className="w-full bg-bg border border-border focus:border-activa px-3 py-2.5 text-text-hi focus:outline-none transition-colors"
                    placeholder="San Cristóbal"
                    value={info.lugar}
                    onChange={e => setInfo(p => ({ ...p, lugar: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-display uppercase tracking-widest text-text-lo mb-2">Tipo de evento</label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS.map(t => {
                    const sel = info.tipo === t
                    return (
                      <button
                        key={t}
                        onClick={() => setInfo(p => ({ ...p, tipo: t }))}
                        className={`px-4 py-1.5 border text-xs font-display uppercase tracking-widest transition-colors ${sel ? 'border-activa text-activa' : 'border-border text-text-mid hover:border-border-hi'}`}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Paso 1: Distancias */}
          {paso === 1 && (
            <div className="space-y-3">
              <h2 className="font-display text-xs uppercase tracking-widest text-text-lo mb-3">Distancias</h2>
              {distancias.map((d, i) => (
                <div key={d.id} className="flex gap-2">
                  <input
                    className="flex-1 bg-bg border border-border focus:border-activa px-3 py-2 text-text-hi focus:outline-none transition-colors"
                    placeholder={`Distancia ${i + 1}`}
                    value={d.nombre}
                    onChange={e => actualizarDistancia(d.id, e.target.value)}
                  />
                  <button
                    onClick={() => eliminarDistancia(d.id)}
                    className="text-text-lo hover:text-danger px-3 transition-colors disabled:opacity-30"
                    disabled={distancias.length === 1}
                    aria-label="Eliminar distancia"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={agregarDistancia}
                className="text-activa hover:text-text-hi text-xs font-display uppercase tracking-widest transition-colors"
              >
                + Distancia
              </button>
            </div>
          )}

          {/* Paso 2: Categorías */}
          {paso === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-xs uppercase tracking-widest text-text-lo mb-3">Categorías</h2>
              {categorias.map(c => (
                <div key={c.id} className="bg-bg border border-border p-4 space-y-3">
                  <div className="grid grid-cols-[1fr_70px_60px_60px_28px] gap-2 items-center">
                    <input
                      className="bg-surface border border-border focus:border-activa px-3 py-2 text-text-hi text-sm focus:outline-none"
                      placeholder="M 30-34"
                      value={c.nombre}
                      onChange={e => actualizarCategoria(c.id, 'nombre', e.target.value)}
                    />
                    <select
                      className="bg-surface border border-border focus:border-activa px-2 py-2 text-text-hi text-sm focus:outline-none"
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
                      className="bg-surface border border-border focus:border-activa px-2 py-2 text-text-hi text-sm focus:outline-none"
                      value={c.edadMin ?? ''}
                      onChange={e => actualizarCategoria(c.id, 'edadMin', e.target.value === '' ? null : Number(e.target.value))}
                    />
                    <input
                      type="number"
                      placeholder="Edad máx"
                      className="bg-surface border border-border focus:border-activa px-2 py-2 text-text-hi text-sm focus:outline-none"
                      value={c.edadMax ?? ''}
                      onChange={e => actualizarCategoria(c.id, 'edadMax', e.target.value === '' ? null : Number(e.target.value))}
                    />
                    <button
                      onClick={() => eliminarCategoria(c.id)}
                      className="text-text-lo hover:text-danger transition-colors disabled:opacity-30"
                      disabled={categorias.length === 1}
                      aria-label="Eliminar categoría"
                    >
                      ✕
                    </button>
                  </div>
                  {(c.olas ?? []).map(ola => (
                    <div key={ola.id} className="flex gap-2 items-center pl-3 border-l-2 border-border">
                      <input
                        className="flex-1 bg-surface border border-border focus:border-activa px-3 py-1.5 text-text-hi text-sm focus:outline-none"
                        placeholder="Nombre de ola"
                        value={ola.nombre}
                        onChange={e => actualizarOlaEnCategoria(c.id, ola.id, 'nombre', e.target.value)}
                      />
                      <input
                        type="time"
                        className="bg-surface border border-border focus:border-activa px-3 py-1.5 text-text-hi text-sm focus:outline-none"
                        value={ola.horaProgramada ?? ''}
                        onChange={e => actualizarOlaEnCategoria(c.id, ola.id, 'horaProgramada', e.target.value)}
                      />
                      <button
                        onClick={() => eliminarOlaEnCategoria(c.id, ola.id)}
                        className="text-text-lo hover:text-danger transition-colors"
                        aria-label="Eliminar ola"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => agregarOlaEnCategoria(c.id)}
                    className="text-text-mid hover:text-activa text-[11px] font-display uppercase tracking-widest transition-colors pl-1"
                  >
                    + ola
                  </button>
                </div>
              ))}
              <button
                onClick={agregarCategoria}
                className="text-activa hover:text-text-hi text-xs font-display uppercase tracking-widest transition-colors"
              >
                + Categoría
              </button>
            </div>
          )}

          {/* Paso 3: Configuración de inicio */}
          {paso === 3 && (
            <div className="space-y-5">
              <h2 className="font-display text-xs uppercase tracking-widest text-text-lo mb-3">Tipo de inicio</h2>
              <div className="flex gap-3">
                {['unico', 'olas'].map(tipo => {
                  const sel = configInicio.inicioTipo === tipo
                  return (
                    <button
                      key={tipo}
                      onClick={() => setConfigInicio(p => ({ ...p, inicioTipo: tipo }))}
                      className={`flex-1 py-3 border font-display uppercase tracking-widest text-xs transition-colors ${sel ? 'border-activa text-activa glow-activa' : 'border-border text-text-mid hover:border-border-hi'}`}
                    >
                      {tipo === 'unico' ? '🚀 Salida única' : '🌊 Por olas'}
                    </button>
                  )
                })}
              </div>
              {configInicio.inicioTipo === 'olas' && (
                <p className="text-xs text-text-mid">Las olas se configuran dentro de cada categoría (paso anterior).</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => paso > 0 ? setPaso(p => p - 1) : navigate('/')}
            className="text-text-mid hover:text-text-hi text-xs font-display uppercase tracking-widest transition-colors px-4 py-2"
          >
            {paso > 0 ? '← Anterior' : 'Cancelar'}
          </button>
          {paso < PASOS.length - 1 ? (
            <NeonButton variant="primary" size="md" onClick={() => setPaso(p => p + 1)} disabled={!puedeAvanzar()}>
              Siguiente →
            </NeonButton>
          ) : (
            <NeonButton variant="primary" size="md" onClick={guardar}>
              Crear evento ✓
            </NeonButton>
          )}
        </div>
      </div>
    </div>
  )
}
