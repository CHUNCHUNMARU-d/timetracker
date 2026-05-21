import { describe, it, expect, vi, beforeEach } from 'vitest'

const atleta = { nombre: 'Ana', apellido: 'Lopez', telefono: '555 123 4567', email: 'a@b.com' }
const tiempo = { tiempoNeto: 3_661_000, lugarGeneral: 1, lugarCategoria: 1, categoria: 'Élite' }
const evento = { nombre: 'Carrera X', lugar: 'CDMX', fecha: '2026-05-21' }

describe('compartirWhatsApp', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn())
  })

  it('builds wa.me URL with phone digits only and message payload', async () => {
    const { compartirWhatsApp } = await import('../../src/utils/share')
    compartirWhatsApp(atleta, tiempo, evento)
    const url = globalThis.open.mock.calls[0][0]
    expect(url).toMatch(/^https:\/\/wa\.me\/525551234567\?text=/)
    expect(decodeURIComponent(url)).toContain('Carrera X')
    expect(decodeURIComponent(url)).toContain('01:01:01')
  })

  it('falls back to wa.me/?text= when phone missing', async () => {
    const { compartirWhatsApp } = await import('../../src/utils/share')
    compartirWhatsApp({ ...atleta, telefono: '' }, tiempo, evento)
    const url = globalThis.open.mock.calls[0][0]
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/)
  })
})

describe('enviarEmailResultado', () => {
  it('passes serviceId, templateId, mapped fields, and publicKey to emailjs send', async () => {
    const sendMock = vi.fn().mockResolvedValue({ status: 200 })
    vi.doMock('@emailjs/browser', () => ({ send: sendMock }))
    const { enviarEmailResultado } = await import('../../src/utils/share')
    await enviarEmailResultado(atleta, tiempo, evento, {
      serviceId: 'svc',
      templateId: 'tmpl',
      publicKey: 'pk',
    })
    expect(sendMock).toHaveBeenCalledWith(
      'svc',
      'tmpl',
      expect.objectContaining({
        to_email: 'a@b.com',
        tiempo: '01:01:01',
        evento: 'Carrera X',
        lugar_general: 1,
      }),
      'pk',
    )
    vi.doUnmock('@emailjs/browser')
  })
})
