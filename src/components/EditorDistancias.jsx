import { uid } from '../utils/tiempo'
import BotonAgregar from './ui/BotonAgregar'

// Distance list for the Nuevo evento wizard. `onChange` takes state updaters.
export default function EditorDistancias({ distancias, onChange }) {
  function actualizar(id, nombre) { onChange(p => p.map(d => d.id === id ? { ...d, nombre } : d)) }
  function eliminar(id) { onChange(p => p.filter(d => d.id !== id)) }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-xs uppercase tracking-widest text-text-lo">Distancias</h2>
        <p className="text-text-mid text-xs mt-1">Recorridos del evento, p. ej. Sprint u Olímpico. Cada atleta corre una.</p>
      </div>
      {distancias.map((d, i) => (
        <div key={d.id} className="flex gap-2">
          <input
            className="flex-1 bg-bg border border-border focus:border-activa px-3 py-2 text-text-hi focus:outline-none transition-colors"
            placeholder={`Distancia ${i + 1}`}
            aria-label={`Distancia ${i + 1}`}
            value={d.nombre}
            onChange={e => actualizar(d.id, e.target.value)}
          />
          <button
            type="button"
            onClick={() => eliminar(d.id)}
            className="min-h-[40px] min-w-[40px] text-text-lo hover:text-danger transition-colors disabled:opacity-30"
            disabled={distancias.length === 1}
            aria-label="Eliminar distancia"
          >
            ✕
          </button>
        </div>
      ))}
      <BotonAgregar onClick={() => onChange(p => [...p, { id: uid(), nombre: '' }])}>Agregar distancia</BotonAgregar>
    </section>
  )
}
