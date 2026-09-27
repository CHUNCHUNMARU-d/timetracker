import { uid } from '../utils/tiempo'
import BotonAgregar from './ui/BotonAgregar'

// Distance list shared by the Nuevo evento wizard and the Configuración tab.
// `onChange` takes state updaters. `enUso` maps distanciaId → athletes
// running it; those distances can't be removed.
export default function EditorDistancias({ distancias, onChange, editable = true, enUso = {} }) {
  function actualizar(id, nombre) { onChange(p => p.map(d => d.id === id ? { ...d, nombre } : d)) }
  function eliminar(id) { onChange(p => p.filter(d => d.id !== id)) }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-xs uppercase tracking-widest text-text-lo">Distancias</h2>
        <p className="text-text-mid text-xs mt-1">Recorridos del evento, p. ej. Sprint u Olímpico. Cada atleta corre una.</p>
      </div>
      {distancias.map((d, i) => {
        const usos = enUso[d.id] ?? 0
        return (
          <div key={d.id} className="flex items-center gap-2">
            <input
              className="flex-1 bg-bg border border-border focus:border-activa px-3 py-2 text-text-hi focus:outline-none transition-colors disabled:opacity-40"
              placeholder={`Distancia ${i + 1}`}
              aria-label={`Distancia ${i + 1}`}
              disabled={!editable}
              value={d.nombre}
              onChange={e => actualizar(d.id, e.target.value)}
            />
            {usos > 0 && (
              <span className="text-text-lo text-xs font-mono shrink-0">{usos} {usos === 1 ? 'atleta' : 'atletas'}</span>
            )}
            <button
              type="button"
              onClick={() => eliminar(d.id)}
              className="min-h-[40px] min-w-[40px] text-text-lo hover:text-danger transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={!editable || distancias.length === 1 || usos > 0}
              title={usos > 0 ? 'Tiene atletas asignados: cámbialos de distancia antes de borrarla' : undefined}
              aria-label="Eliminar distancia"
            >
              ✕
            </button>
          </div>
        )
      })}
      {editable && (
        <BotonAgregar onClick={() => onChange(p => [...p, { id: uid(), nombre: '' }])}>Agregar distancia</BotonAgregar>
      )}
    </section>
  )
}
