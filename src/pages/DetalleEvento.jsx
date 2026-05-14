import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../db'
import ImportarCSV from '../components/ImportarCSV'

const TABS = ['Atletas', 'Cronometraje', 'Resultados']
const ESTADOS = ['borrador', 'activo', 'finalizado']

export default function DetalleEvento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [evento, setEvento] = useState(null)
  const [atletas, setAtletas] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [modalAtleta, setModalAtleta] = useState(null)
  const [mostrarCSV, setMostrarCSV] = useState(false)

  const eventoId = Number(id)

  async function cargar() {
    const ev = await db.eventos.get(eventoId)
    setEvento(ev)
    const a = await db.atletas.where('eventoId').equals(eventoId).toArray()
    setAtletas(a)
  }

  useEffect(() => { cargar() }, [eventoId])

  async function cambiarEstado(estado) {
    await db.eventos.update(eventoId, { estado })
    setEvento(p => ({ ...p, estado }))
  }

  async function guardarAtleta(atleta) {
    if (atleta.id) {
      await db.atletas.update(atleta.id, atleta)
    } else {
      await db.atletas.add({ ...atleta, eventoId })
    }
    setModalAtleta(null)
    cargar()
  }

  async function eliminarAtleta(atletaId) {
    if (!confirm('¿Eliminar atleta?')) return
    await db.atletas.delete(atletaId)
    setAtletas(p => p.filter(a => a.id !== atletaId))
  }

  if (!evento) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Cargando...</div>

  const atletasFiltrados = atletas.filter(a =>
    !busqueda ||
    a.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.apellido?.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.dorsal?.includes(busqueda)
  )

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white text-sm mb-3 transition-colors block">
            ← Inicio
          </button>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">{evento.nombre}</h1>
              <p className="text-slate-400 text-sm mt-0.5">{evento.lugar} · {evento.fecha}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={evento.estado}
                onChange={e => cambiarEstado(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
              >
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <button
                onClick={() => navigate(`/eventos/${id}/timing`)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                ⏱ Cronometrar
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {TABS.map((t, i) => (
              <button
                key={t}
                onClick={() => { setTab(i); if (i === 2) navigate(`/eventos/${id}/resultados`) }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === i ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Atletas tab */}
        {tab === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="Buscar por nombre o dorsal..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              <button
                onClick={() => setModalAtleta({})}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                + Agregar atleta
              </button>
              <button
                onClick={() => setMostrarCSV(p => !p)}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                📂 Importar CSV
              </button>
            </div>

            {mostrarCSV && (
              <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                <ImportarCSV
                  eventoId={eventoId}
                  categorias={evento.categorias ?? []}
                  distancias={evento.distancias ?? []}
                  onImportado={() => { setMostrarCSV(false); cargar() }}
                />
              </div>
            )}

            <div className="text-sm text-slate-500 mb-2">{atletas.length} atletas registrados</div>

            {atletasFiltrados.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p>No hay atletas registrados</p>
                <p className="text-xs mt-1">Importa un CSV o agrega atletas manualmente</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-800 text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5">Dorsal</th>
                      <th className="px-4 py-2.5">Nombre</th>
                      <th className="px-4 py-2.5 hidden sm:table-cell">Categoría</th>
                      <th className="px-4 py-2.5 hidden sm:table-cell">Distancia</th>
                      <th className="px-4 py-2.5 hidden md:table-cell">Email</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {atletasFiltrados.map(a => {
                      const cat = evento.categorias?.find(c => c.id === a.categoriaId)
                      const dist = evento.distancias?.find(d => d.id === a.distanciaId)
                      return (
                        <tr key={a.id} className="border-t border-slate-800 hover:bg-slate-800/50 text-slate-300">
                          <td className="px-4 py-2.5 font-mono font-bold text-white">{a.dorsal}</td>
                          <td className="px-4 py-2.5">{a.nombre} {a.apellido}</td>
                          <td className="px-4 py-2.5 hidden sm:table-cell text-slate-400">{cat?.nombre ?? '—'}</td>
                          <td className="px-4 py-2.5 hidden sm:table-cell text-slate-400">{dist?.nombre ?? '—'}</td>
                          <td className="px-4 py-2.5 hidden md:table-cell text-slate-500">{a.email || '—'}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-2">
                              <button onClick={() => setModalAtleta(a)} className="text-slate-500 hover:text-white transition-colors text-xs">✏️</button>
                              <button onClick={() => eliminarAtleta(a.id)} className="text-slate-500 hover:text-red-400 transition-colors text-xs">✕</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal atleta */}
      {modalAtleta && (
        <ModalAtleta
          atleta={modalAtleta}
          categorias={evento.categorias ?? []}
          distancias={evento.distancias ?? []}
          onGuardar={guardarAtleta}
          onCerrar={() => setModalAtleta(null)}
        />
      )}
    </div>
  )
}

function ModalAtleta({ atleta, categorias, distancias, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    dorsal: atleta.dorsal ?? '',
    nombre: atleta.nombre ?? '',
    apellido: atleta.apellido ?? '',
    genero: atleta.genero ?? 'M',
    añoNacimiento: atleta.añoNacimiento ?? '',
    categoriaId: atleta.categoriaId ?? '',
    distanciaId: atleta.distanciaId ?? '',
    email: atleta.email ?? '',
    telefono: atleta.telefono ?? '',
    ...(atleta.id ? { id: atleta.id } : {}),
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">{atleta.id ? 'Editar atleta' : 'Nuevo atleta'}</h3>
          <button onClick={onCerrar} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Dorsal *</label>
            <input className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              value={form.dorsal} onChange={e => set('dorsal', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Género</label>
            <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
              value={form.genero} onChange={e => set('genero', e.target.value)}>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="X">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nombre *</label>
            <input className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Apellido *</label>
            <input className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              value={form.apellido} onChange={e => set('apellido', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Año de nacimiento</label>
            <input type="number" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              value={form.añoNacimiento} onChange={e => set('añoNacimiento', Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Categoría</label>
            <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
              value={form.categoriaId} onChange={e => set('categoriaId', e.target.value)}>
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Distancia</label>
            <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
              value={form.distanciaId} onChange={e => set('distanciaId', e.target.value)}>
              <option value="">Sin distancia</option>
              {distancias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Teléfono</label>
            <input className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              value={form.telefono} onChange={e => set('telefono', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Email</label>
          <input type="email" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            value={form.email} onChange={e => set('email', e.target.value)} />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onCerrar} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onGuardar(form)}
            disabled={!form.dorsal || !form.nombre || !form.apellido}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
