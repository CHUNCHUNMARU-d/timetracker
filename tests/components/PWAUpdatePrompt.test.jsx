import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import PWAUpdatePrompt from '../../src/components/PWAUpdatePrompt'

// The service worker is the external boundary: capture the callbacks the
// prompt registers and the update function it gets back.
const sw = vi.hoisted(() => ({ opciones: null, actualizar: null }))
vi.mock('virtual:pwa-register', () => ({
  registerSW: opciones => {
    sw.opciones = opciones
    sw.actualizar = vi.fn()
    return sw.actualizar
  },
}))

describe('PWAUpdatePrompt', () => {
  it('stays hidden until a new version is waiting, then Recargar activates it', () => {
    render(<PWAUpdatePrompt />)
    expect(screen.queryByText('Nueva versión disponible')).toBeNull()

    act(() => sw.opciones.onNeedRefresh())
    fireEvent.click(screen.getByText('Recargar'))
    expect(sw.actualizar).toHaveBeenCalledWith(true)
  })

  it('Después hides the prompt without updating', () => {
    render(<PWAUpdatePrompt />)
    act(() => sw.opciones.onNeedRefresh())

    fireEvent.click(screen.getByText('Después'))
    expect(screen.queryByText('Nueva versión disponible')).toBeNull()
    expect(sw.actualizar).not.toHaveBeenCalled()
  })
})
