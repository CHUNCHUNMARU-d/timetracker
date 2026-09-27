import { uid } from '../utils/tiempo'
import { tipoDeInicio } from '../utils/estado'
import BotonAgregar from './ui/BotonAgregar'

const GENEROS = [['M', 'Masculino'], ['F', 'Femenino'], ['X', 'Mixta']]
const labelCls = 'block text-[10px] font-display uppercase tracking-widest text-text-lo mb-1'
const inputCls = 'w-full bg-surface border border-border focus:border-activa px-3 py-2 text-text-hi text-sm focus:outline-none transition-colors disabled:opacity-40'
const borrarCls = 'min-h-[40px] min-w-[40px] text-text-lo hover:text-danger transition-colors disabled:opacity-30 disabled:cursor-not-allowed'

// Categorías + olas editor shared by the Nuevo evento wizard and the
// Configuración tab. `onChange` takes state updaters, so a useState setter
// fits. The start type shown is derived from the olas unless the caller
// passes the one a locked event was saved with.
export default function EditorCategorias({ categorias, onChange, editable = true, inicioTipo = tipoDeInicio(categorias) }) {
  function agregarCategoria() {
    onChange(p => [...p, { id: uid(), nombre: '', genero: 'M', edadMin: null, edadMax: null, olas: [] }])
  }
  function actualizarCategoria(id, campo, valor) {
    onChange(p => p.map(c => c.id === id ? { ...c, [campo]: valor } : c))
  }
  function eliminarCategoria(id) {
    onChange(p => p.filter(c => c.id !== id))
  }

  function agregarOla(catId) {
    onChange(p => p.map(c => c.id !== catId ? c : {
      ...c,
      olas: [...(c.olas ?? []), { id: uid(), nombre: `Ola ${(c.olas ?? []).length + 1}`, horaProgramada: '' }],
    }))
  }
  function actualizarOla(catId, olaId, campo, valor) {
    onChange(p => p.map(c => c.id !== catId ? c : {
      ...c,
      olas: c.olas.map(o => o.id === olaId ? { ...o, [campo]: valor } : o),
    }))
  }
  function eliminarOla(catId, olaId) {
    onChange(p => p.map(c => c.id !== catId ? c : {
      ...c,
      olas: c.olas.filter(o => o.id !== olaId),
    }))
  }

  const edad = v => v === '' ? null : Number(v)
  const numOlas = categorias.reduce((n, c) => n + (c.olas?.length ?? 0), 0)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xs uppercase tracking-widest text-text-lo">Categorías</h2>
        <p className="text-text-mid text-xs mt-1">
          Grupos que se premian por separado. Agrega olas solo si una categoría sale a otra hora.
        </p>
      </div>

      <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-border bg-bg px-4 py-3">
        <span className="text-text-lo text-[10px] font-display uppercase tracking-widest">Tipo de inicio</span>
        <span className="text-activa font-display font-bold text-sm uppercase tracking-wider">
          {inicioTipo === 'olas' ? `🌊 Por olas · ${numOlas} ${numOlas === 1 ? 'ola' : 'olas'}` : '🚀 Salida única'}
        </span>
        <span className="text-text-lo text-xs">
          {inicioTipo === 'olas' ? 'Cada ola se inicia por separado en Cronometraje.' : 'Todos salen juntos. Al agregar una ola cambia solo.'}
        </span>
      </div>

      {categorias.map(c => (
        <div key={c.id} className="bg-bg border border-border p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[160px]">
              <label htmlFor={`${c.id}-nombre`} className={labelCls}>Nombre</label>
              <input
                id={`${c.id}-nombre`}
                className={inputCls}
                placeholder="M 30-34"
                disabled={!editable}
                value={c.nombre}
                onChange={e => actualizarCategoria(c.id, 'nombre', e.target.value)}
              />
            </div>
            <div className="w-32">
              <label htmlFor={`${c.id}-genero`} className={labelCls}>Género</label>
              <select
                id={`${c.id}-genero`}
                className={inputCls}
                disabled={!editable}
                value={c.genero}
                onChange={e => actualizarCategoria(c.id, 'genero', e.target.value)}
              >
                {GENEROS.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
              </select>
            </div>
            <div className="w-24">
              <label htmlFor={`${c.id}-edadMin`} className={labelCls}>Edad mín</label>
              <input
                id={`${c.id}-edadMin`}
                type="number"
                className={inputCls}
                disabled={!editable}
                value={c.edadMin ?? ''}
                onChange={e => actualizarCategoria(c.id, 'edadMin', edad(e.target.value))}
              />
            </div>
            <div className="w-24">
              <label htmlFor={`${c.id}-edadMax`} className={labelCls}>Edad máx</label>
              <input
                id={`${c.id}-edadMax`}
                type="number"
                className={inputCls}
                disabled={!editable}
                value={c.edadMax ?? ''}
                onChange={e => actualizarCategoria(c.id, 'edadMax', edad(e.target.value))}
              />
            </div>
            <button
              type="button"
              onClick={() => eliminarCategoria(c.id)}
              disabled={!editable || categorias.length === 1}
              className={borrarCls}
              aria-label="Eliminar categoría"
            >
              ✕
            </button>
          </div>

          {(c.olas ?? []).map(ola => (
            <div key={ola.id} className="flex flex-wrap items-end gap-2 pl-3 border-l-2 border-border">
              <div className="flex-1 min-w-[140px]">
                <label htmlFor={`${ola.id}-nombre`} className={labelCls}>Nombre de ola</label>
                <input
                  id={`${ola.id}-nombre`}
                  className={inputCls}
                  placeholder="Ola 1"
                  disabled={!editable}
                  value={ola.nombre}
                  onChange={e => actualizarOla(c.id, ola.id, 'nombre', e.target.value)}
                />
              </div>
              <div className="w-36">
                <label htmlFor={`${ola.id}-hora`} className={labelCls}>Hora programada</label>
                <input
                  id={`${ola.id}-hora`}
                  type="time"
                  className={inputCls}
                  disabled={!editable}
                  value={ola.horaProgramada ?? ''}
                  onChange={e => actualizarOla(c.id, ola.id, 'horaProgramada', e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => eliminarOla(c.id, ola.id)}
                disabled={!editable}
                className={borrarCls}
                aria-label="Eliminar ola"
              >
                ✕
              </button>
            </div>
          ))}

          {editable && <BotonAgregar onClick={() => agregarOla(c.id)}>Agregar ola</BotonAgregar>}
        </div>
      ))}

      {editable && <BotonAgregar onClick={agregarCategoria}>Agregar categoría</BotonAgregar>}
    </section>
  )
}
