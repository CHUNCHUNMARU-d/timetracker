import { useState } from 'react'
import NeonButton from './ui/NeonButton'

export default function ModalAtleta({ atleta, categorias, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    dorsal: atleta.dorsal ?? '',
    nombre: atleta.nombre ?? '',
    apellido: atleta.apellido ?? '',
    genero: atleta.genero ?? 'M',
    añoNacimiento: atleta.añoNacimiento ?? '',
    categoriaId: atleta.categoriaId ?? '',
    olaId: atleta.olaId ?? '',
    email: atleta.email ?? '',
    telefono: atleta.telefono ?? '',
    ...(atleta.id ? { id: atleta.id } : {}),
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const inputCls = 'w-full bg-bg border border-border focus:border-activa px-3 py-2 text-text-hi text-sm focus:outline-none transition-colors disabled:opacity-40'
  const labelCls = 'block text-[10px] font-display uppercase tracking-widest text-text-lo mb-1'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="atleta-modal-title"
      className="fixed inset-0 bg-bg/90 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <div className="bg-elevated border border-border p-6 w-full max-w-md space-y-4">
        <div className="flex justify-between items-center">
          <h3 id="atleta-modal-title" className="font-display text-lg uppercase tracking-widest text-text-hi">
            {atleta.id ? 'Editar atleta' : 'Nuevo atleta'}
          </h3>
          <button onClick={onCerrar} className="text-text-mid hover:text-text-hi transition-colors text-lg" aria-label="Cerrar">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Dorsal *</label>
            <input className={inputCls} value={form.dorsal} onChange={e => set('dorsal', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Género</label>
            <select className={inputCls} value={form.genero} onChange={e => set('genero', e.target.value)}>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="X">Otro</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Nombre *</label>
            <input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Apellido *</label>
            <input className={inputCls} value={form.apellido} onChange={e => set('apellido', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Año de nacimiento</label>
            <input type="number" className={inputCls} value={form.añoNacimiento} onChange={e => set('añoNacimiento', Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Categoría</label>
            <select
              className={inputCls}
              value={form.categoriaId}
              onChange={e => { set('categoriaId', e.target.value); set('olaId', '') }}
            >
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Ola</label>
            <select
              className={inputCls}
              value={form.olaId}
              onChange={e => set('olaId', e.target.value)}
              disabled={!form.categoriaId}
            >
              <option value="">Sin ola</option>
              {(categorias.find(c => c.id === form.categoriaId)?.olas ?? []).map(o => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input className={inputCls} value={form.telefono} onChange={e => set('telefono', e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Email</label>
          <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} />
        </div>

        <div className="flex gap-3 pt-2">
          <NeonButton variant="ghost" size="md" onClick={onCerrar} className="flex-1">Cancelar</NeonButton>
          <NeonButton
            variant="primary"
            size="md"
            onClick={() => onGuardar(form)}
            disabled={!form.dorsal || !form.nombre || !form.apellido}
            className="flex-1"
          >
            Guardar
          </NeonButton>
        </div>
      </div>
    </div>
  )
}
