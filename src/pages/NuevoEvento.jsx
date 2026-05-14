import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { uid } from '../utils/tiempo'

const TIPOS = ['triatlón', 'duatlón', 'carrera', 'ciclismo', 'otro']

const PASOS = ['Información', 'Distancias', 'Categorías', 'Inicio']

export default function NuevoEvento() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState(0)

  const [info, setInfo] = useState({ nombre: '', fecha: '', lugar: '', tipo: 'triatlón' })
  const [distancias, setDistancias] = useState([{ id: uid(), nombre: 'Sprint' }, { id: uid(), nombre: 'Olímpico' }])
  const [categorias, setCategorias] = useState([
    { id: uid(), nombre: 'M 30-34', genero: 'M', edadMin: 30, edadMax: 34 },
    { id: uid(), nombre: 'F 30-34', genero: 'F', edadMin: 30, edadMax: 34 },
  ])
  const [configInicio, setConfigInicio] = useState({
    inicioTipo: 'unico',
    horaInicio: null,
    olas: [{ id: uid(), nombre: 'Ola 1', horaInicio: null, categoriaIds: [] }],
  })

  function agregarDistancia() {
    setDistancias(prev => [...prev, { id: uid(), nombre: '' }])
  }
  function actualizarDistancia(id, nombre) {
    setDistancias(prev => prev.map(d => d.id === id ? { ...d, nombre } : d))
  }
  function eliminarDistancia(id) {
    setDistancias(prev => prev.filter(d => d.id !== id))
  }

  function agregarCategoria() {
    setCategorias(prev => [...prev, { id: uid(), nombre: '', genero: 'M', edadMin: 0, edadMax: 99 }])
  }
  function actualizarCategoria(id, campo, valor) {
    setCategorias(prev => prev.map(c => c.id === id ? { ...c, [campo]: valor } : c))
  }
  function eliminarCategoria(id) {
    setCategorias(prev => prev.filter(c => c.id !== id))
  }

  function agregarOla() {
    setConfigInicio(prev => ({
      ...prev,
      olas: [...prev.olas, { id: uid(), nombre: `Ola ${prev.olas.length + 1}`, horaInicio: null, categoriaIds: [] }],
    }))
  }
  function actualizarOla(id, campo, valor) {
    setConfigInicio(prev => ({
      ...prev,
      olas: prev.olas.map(o => o.id === id ? { ...o, [campo]: valor } : o),
    }))
  }
  function toggleCatOla(olaId, catId) {
    setConfigInicio(prev => ({
      ...prev,
      olas: prev.olas.map(o => {
        if (o.id !== olaId) return o
        const ids = o.categoriaIds.includes(catId)
          ? o.categoriaIds.filter(id => id !== catId)
          : [...o.categoriaIds, catId]
        return { ...o, categoriaIds: ids }
      }),
    }))
  }

  async function guardar() {
    const evento = {
      nombre: info.nombre,
      fecha: info.fecha,
      lugar: info.lugar,
      tipo: info.tipo,
      estado: 'borrador',
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
    <div className="min-h-screen bg-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white text-sm mb-6 transition-colors">
          ← Volver
        </button>

        <h1 className="text-2xl font-bold text-white mb-6">Nuevo evento</h1>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {PASOS.map((p, i) => (
            <div key={p} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= paso ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                {i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${i === paso ? 'text-white' : 'text-slate-500'}`}>{p}</span>
              {i < PASOS.length - 1 && <div className={`h-px w-6 ${i < paso ? 'bg-emerald-600' : 'bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          {/* Paso 0: Información */}
          {paso === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Información del evento</h2>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre del evento *</label>
                <input
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Triatlón San Cristóbal 2026"
                  value={info.nombre}
                  onChange={e => setInfo(p => ({ ...p, nombre: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Fecha *</label>
                  <input
                    type="date"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    value={info.fecha}
                    onChange={e => setInfo(p => ({ ...p, fecha: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Lugar *</label>
                  <input
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="San Cristóbal de las Casas"
                    value={info.lugar}
                    onChange={e => setInfo(p => ({ ...p, lugar: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Tipo de evento</label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS.map(t => (
                    <button
                      key={t}
                      onClick={() => setInfo(p => ({ ...p, tipo: t }))}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${info.tipo === t ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Paso 1: Distancias */}
          {paso === 1 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white mb-4">Distancias del evento</h2>
              {distancias.map((d, i) => (
                <div key={d.id} className="flex gap-2">
                  <input
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    placeholder={`Distancia ${i + 1}`}
                    value={d.nombre}
                    onChange={e => actualizarDistancia(d.id, e.target.value)}
                  />
                  <button
                    onClick={() => eliminarDistancia(d.id)}
                    className="text-slate-600 hover:text-red-400 px-2 transition-colors"
                    disabled={distancias.length === 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={agregarDistancia}
                className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
              >
                + Agregar distancia
              </button>
            </div>
          )}

          {/* Paso 2: Categorías */}
          {paso === 2 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white mb-4">Categorías</h2>
              <div className="grid grid-cols-[1fr_80px_70px_70px_30px] gap-2 text-xs text-slate-500 px-1">
                <span>Nombre</span><span>Género</span><span>Edad mín</span><span>Edad máx</span><span />
              </div>
              {categorias.map(c => (
                <div key={c.id} className="grid grid-cols-[1fr_80px_70px_70px_30px] gap-2 items-center">
                  <input
                    className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="M 30-34"
                    value={c.nombre}
                    onChange={e => actualizarCategoria(c.id, 'nombre', e.target.value)}
                  />
                  <select
                    className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    value={c.genero}
                    onChange={e => actualizarCategoria(c.id, 'genero', e.target.value)}
                  >
                    <option value="M">M</option>
                    <option value="F">F</option>
                    <option value="X">X</option>
                  </select>
                  <input
                    type="number"
                    className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    value={c.edadMin}
                    onChange={e => actualizarCategoria(c.id, 'edadMin', Number(e.target.value))}
                  />
                  <input
                    type="number"
                    className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    value={c.edadMax}
                    onChange={e => actualizarCategoria(c.id, 'edadMax', Number(e.target.value))}
                  />
                  <button
                    onClick={() => eliminarCategoria(c.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                    disabled={categorias.length === 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={agregarCategoria}
                className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
              >
                + Agregar categoría
              </button>
            </div>
          )}

          {/* Paso 3: Configuración de inicio */}
          {paso === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-white mb-4">Tipo de inicio</h2>
              <div className="flex gap-3">
                {['unico', 'olas'].map(tipo => (
                  <button
                    key={tipo}
                    onClick={() => setConfigInicio(p => ({ ...p, inicioTipo: tipo }))}
                    className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${configInicio.inicioTipo === tipo ? 'border-emerald-500 bg-emerald-900/30 text-emerald-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
                  >
                    {tipo === 'unico' ? '🚀 Salida única' : '🌊 Por olas'}
                  </button>
                ))}
              </div>

              {configInicio.inicioTipo === 'olas' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">Define las olas de salida y asigna categorías a cada una.</p>
                  {configInicio.olas.map(ola => (
                    <div key={ola.id} className="bg-slate-900 rounded-xl p-4 border border-slate-700 space-y-3">
                      <div className="flex gap-3">
                        <input
                          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                          value={ola.nombre}
                          onChange={e => actualizarOla(ola.id, 'nombre', e.target.value)}
                        />
                        <input
                          type="time"
                          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                          onChange={e => actualizarOla(ola.id, 'horaProgramada', e.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {categorias.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => toggleCatOla(ola.id, cat.id)}
                            className={`text-xs px-3 py-1 rounded-full transition-colors ${ola.categoriaIds.includes(cat.id) ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                          >
                            {cat.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={agregarOla}
                    className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
                  >
                    + Agregar ola
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => paso > 0 ? setPaso(p => p - 1) : navigate('/')}
            className="text-slate-400 hover:text-white transition-colors px-4 py-2"
          >
            {paso > 0 ? '← Anterior' : 'Cancelar'}
          </button>
          {paso < PASOS.length - 1 ? (
            <button
              onClick={() => setPaso(p => p + 1)}
              disabled={!puedeAvanzar()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={guardar}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              Crear evento ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
