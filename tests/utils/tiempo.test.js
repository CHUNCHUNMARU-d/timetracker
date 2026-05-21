import { describe, it, expect } from 'vitest'
import { msAHora, horaAMs, ahora, uid } from '../../src/utils/tiempo'

describe('msAHora', () => {
  it('formats ms as HH:MM:SS', () => {
    expect(msAHora(0)).toBe('00:00:00')
    expect(msAHora(1000)).toBe('00:00:01')
    expect(msAHora(60_000)).toBe('00:01:00')
    expect(msAHora(3_600_000)).toBe('01:00:00')
    expect(msAHora(3_661_000)).toBe('01:01:01')
  })

  it('returns placeholder for null/undefined', () => {
    expect(msAHora(null)).toBe('--:--:--')
    expect(msAHora(undefined)).toBe('--:--:--')
  })

  it('handles times over 24h', () => {
    expect(msAHora(25 * 3_600_000)).toBe('25:00:00')
  })
})

describe('horaAMs', () => {
  it('converts HH:MM to ms from midnight', () => {
    expect(horaAMs('00:00')).toBe(0)
    expect(horaAMs('01:00')).toBe(3_600_000)
    expect(horaAMs('00:30')).toBe(1_800_000)
    expect(horaAMs('23:59')).toBe((23 * 60 + 59) * 60 * 1000)
  })
})

describe('ahora', () => {
  it('returns a timestamp in ms', () => {
    const before = Date.now()
    const t = ahora()
    const after = Date.now()
    expect(t).toBeGreaterThanOrEqual(before)
    expect(t).toBeLessThanOrEqual(after)
  })
})

describe('uid', () => {
  it('returns a non-empty string', () => {
    const id = uid()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('is unlikely to collide across many calls', () => {
    const set = new Set()
    for (let i = 0; i < 10_000; i++) set.add(uid())
    expect(set.size).toBe(10_000)
  })
})
