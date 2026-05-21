import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let originalBC

function makeMockBC(impl) {
  return function MockBC() {
    Object.assign(this, impl)
  }
}

beforeEach(() => {
  vi.resetModules()
  originalBC = globalThis.BroadcastChannel
})

afterEach(() => {
  globalThis.BroadcastChannel = originalBC
})

describe('sync (BroadcastChannel guarded)', () => {
  it('emitirActualizacion posts message when BroadcastChannel exists', async () => {
    const post = vi.fn()
    globalThis.BroadcastChannel = makeMockBC({
      postMessage: post,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    const { emitirActualizacion } = await import('../../src/utils/sync')
    emitirActualizacion(42, { hint: 'foo' })
    expect(post).toHaveBeenCalledWith({ tipo: 'actualizacion', eventoId: 42, hint: 'foo' })
  })

  it('emitirActualizacion is a no-op when BroadcastChannel is undefined', async () => {
    delete globalThis.BroadcastChannel
    const { emitirActualizacion } = await import('../../src/utils/sync')
    expect(() => emitirActualizacion(1)).not.toThrow()
  })

  it('escucharActualizaciones returns no-op unsubscribe when BC undefined', async () => {
    delete globalThis.BroadcastChannel
    const { escucharActualizaciones } = await import('../../src/utils/sync')
    const off = escucharActualizaciones(() => {})
    expect(typeof off).toBe('function')
    expect(() => off()).not.toThrow()
  })

  it('escucharActualizaciones registers and unregisters the message listener', async () => {
    const add = vi.fn()
    const remove = vi.fn()
    globalThis.BroadcastChannel = makeMockBC({
      postMessage: vi.fn(),
      addEventListener: add,
      removeEventListener: remove,
    })
    const { escucharActualizaciones } = await import('../../src/utils/sync')
    const off = escucharActualizaciones(() => {})
    expect(add).toHaveBeenCalledWith('message', expect.any(Function))
    off()
    expect(remove).toHaveBeenCalledWith('message', add.mock.calls[0][1])
  })

  it('callback only fires for tipo="actualizacion" messages', async () => {
    let handler
    globalThis.BroadcastChannel = makeMockBC({
      postMessage: vi.fn(),
      addEventListener: (_evt, h) => { handler = h },
      removeEventListener: vi.fn(),
    })
    const { escucharActualizaciones } = await import('../../src/utils/sync')
    const cb = vi.fn()
    escucharActualizaciones(cb)
    handler({ data: { tipo: 'otro', eventoId: 1 } })
    expect(cb).not.toHaveBeenCalled()
    handler({ data: { tipo: 'actualizacion', eventoId: 1 } })
    expect(cb).toHaveBeenCalledOnce()
  })
})
