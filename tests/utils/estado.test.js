import { describe, it, expect } from 'vitest'
import { puedeTransicionar, siguienteFase, esEditable, puedeRegistrarTiempos, tipoDeInicio } from '../../src/utils/estado'

describe('puedeTransicionar', () => {
  const evPrep = { estado: 'preparacion', categorias: [{ id: 'c1', nombre: 'Cat' }] }
  const atletas = [{ id: 1 }]

  it('allows preparacion → activa when athletes and categories present', () => {
    expect(puedeTransicionar(evPrep, atletas, 'preparacion', 'activa').ok).toBe(true)
  })

  it('blocks preparacion → activa when athletes empty', () => {
    const r = puedeTransicionar(evPrep, [], 'preparacion', 'activa')
    expect(r.ok).toBe(false)
    expect(r.motivo).toMatch(/atleta/)
  })

  it('blocks preparacion → activa when categorías empty', () => {
    const r = puedeTransicionar({ estado: 'preparacion', categorias: [] }, atletas, 'preparacion', 'activa')
    expect(r.ok).toBe(false)
    expect(r.motivo).toMatch(/categoría/)
  })

  it('allows activa → terminada unconditionally', () => {
    expect(puedeTransicionar({ estado: 'activa' }, [], 'activa', 'terminada').ok).toBe(true)
  })

  it('blocks skipping phases', () => {
    const r = puedeTransicionar(evPrep, atletas, 'preparacion', 'terminada')
    expect(r.ok).toBe(false)
  })

  it('blocks backwards transitions', () => {
    const r = puedeTransicionar({ estado: 'activa' }, atletas, 'activa', 'preparacion')
    expect(r.ok).toBe(false)
  })

  it('blocks transition when desde does not match evento.estado', () => {
    const r = puedeTransicionar({ estado: 'activa' }, atletas, 'preparacion', 'activa')
    expect(r.ok).toBe(false)
  })
})

describe('siguienteFase', () => {
  it('returns the next phase', () => {
    expect(siguienteFase('preparacion')).toBe('activa')
    expect(siguienteFase('activa')).toBe('terminada')
  })
  it('returns null past terminada', () => {
    expect(siguienteFase('terminada')).toBeNull()
  })
})

describe('helpers', () => {
  it('esEditable only in preparacion', () => {
    expect(esEditable({ estado: 'preparacion' })).toBe(true)
    expect(esEditable({ estado: 'activa' })).toBe(false)
    expect(esEditable({ estado: 'terminada' })).toBe(false)
  })
  it('puedeRegistrarTiempos only in activa', () => {
    expect(puedeRegistrarTiempos({ estado: 'preparacion' })).toBe(false)
    expect(puedeRegistrarTiempos({ estado: 'activa' })).toBe(true)
    expect(puedeRegistrarTiempos({ estado: 'terminada' })).toBe(false)
  })
})

describe('tipoDeInicio', () => {
  it.each([
    ['event without categorías → unico', undefined, 'unico'],
    ['no categorías → unico', [], 'unico'],
    ['categorías without olas → unico', [{ id: 'a', olas: [] }, { id: 'b' }], 'unico'],
    ['one categoría with an ola → olas', [{ id: 'a', olas: [] }, { id: 'b', olas: [{ id: 'o1' }] }], 'olas'],
  ])('%s', (_, categorias, esperado) => {
    expect(tipoDeInicio(categorias)).toBe(esperado)
  })
})
