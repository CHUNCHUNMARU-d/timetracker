import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { uid } from '../utils/tiempo'
import { tipoDeInicio } from '../utils/estado'
import NeonButton from '../components/ui/NeonButton'
import EditorDistancias from '../components/EditorDistancias'
import EditorCategorias from '../components/EditorCategorias'

const TIPOS = ['triatlón', 'duatlón', 'carrera', 'ciclismo', 'otro']
const PASOS = ['Información', 'Distancias', 'Categorías']

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

  async function guardar() {
    const evento = {
      nombre: info.nombre,
      fecha: info.fecha,
      lugar: info.lugar,
      tipo: info.tipo,
      estado: 'preparacion',
      distancias,
      categorias,
      configuracion: { inicioTipo: tipoDeInicio(categorias), horaInicio: null },
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

          {paso === 1 && <EditorDistancias distancias={distancias} onChange={setDistancias} />}

          {paso === 2 && <EditorCategorias categorias={categorias} onChange={setCategorias} />}
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
            <NeonButton variant="primary" size="md" onClick={guardar} disabled={!puedeAvanzar()}>
              Crear evento ✓
            </NeonButton>
          )}
        </div>
      </div>
    </div>
  )
}
