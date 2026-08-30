import { describe, it, expect, vi, beforeEach } from 'vitest'

const saveMock = vi.fn()
const textMock = vi.fn()
const addPageMock = vi.fn()
const setPageMock = vi.fn()
const getNumberOfPagesMock = vi.fn(() => 1)
const autoTableMock = vi.fn()

vi.mock('jspdf', () => {
  function FakeJsPdf() {
    this.setFontSize = vi.fn()
    this.setTextColor = vi.fn()
    this.setDrawColor = vi.fn()
    this.setLineWidth = vi.fn()
    this.line = vi.fn()
    this.text = textMock
    this.addPage = addPageMock
    this.setPage = setPageMock
    this.getNumberOfPages = getNumberOfPagesMock
    this.save = saveMock
  }
  return { default: FakeJsPdf }
})

vi.mock('jspdf-autotable', () => ({
  default: (...args) => autoTableMock(...args),
}))

const evento = { nombre: 'Carrera X', lugar: 'CDMX', fecha: '2026-05-21', tipo: 'Triatlón' }

describe('exportarResultadosPDF', () => {
  it('renders event header text and saves with sanitised filename', async () => {
    const { exportarResultadosPDF } = await import('../../src/utils/pdf')
    await exportarResultadosPDF(evento, [
      { lugarGeneral: 1, dorsal: '1', nombre: 'A', categoria: 'Élite', distancia: 'Olímpica', tiempoNeto: 3_600_000, lugarCategoria: 1 },
    ])
    expect(textMock).toHaveBeenCalledWith('Carrera X', 14, 20)
    expect(saveMock).toHaveBeenCalledWith('resultados_Carrera_X.pdf')
  })

  it('builds the autoTable body from filas mapping tiempoNeto via msAHora', async () => {
    autoTableMock.mockClear()
    const { exportarResultadosPDF } = await import('../../src/utils/pdf')
    await exportarResultadosPDF(evento, [
      { lugarGeneral: 1, dorsal: '1', nombre: 'A', categoria: 'Élite', distancia: 'Olímpica', tiempoNeto: 3_661_000, lugarCategoria: 1 },
    ])
    const call = autoTableMock.mock.calls[0][1]
    expect(call.head[0]).toContain('Tiempo')
    expect(call.body[0]).toEqual([1, '1', 'A', 'Élite', 'Olímpica', '01:01:01', 1])
  })

  it('renders an empty body when filas is empty (does not throw)', async () => {
    autoTableMock.mockClear()
    const { exportarResultadosPDF } = await import('../../src/utils/pdf')
    await expect(exportarResultadosPDF(evento, [])).resolves.not.toThrow()
    expect(autoTableMock.mock.calls[0][1].body).toEqual([])
  })
})

describe('exportarResultadosCompletoPDF', () => {
  const eventoMulti = {
    nombre: 'Carrera Multi',
    lugar: 'CDMX',
    fecha: '2026-05-21',
    tipo: 'Triatlón',
    categorias: [
      { id: 'cat-A', nombre: 'Élite M', olas: [{ id: 'ola-1', nombre: 'Ola 1' }, { id: 'ola-2', nombre: 'Ola 2' }] },
      { id: 'cat-B', nombre: 'Sub-23 F', olas: [{ id: 'ola-3', nombre: 'Ola 3' }] },
    ],
  }
  const filasMulti = [
    { atletaId: 1, dorsal: '1', nombre: 'A', genero: 'M', categoriaId: 'cat-A', olaId: 'ola-1', lugarCategoria: 1, tiempoNeto: 3_600_000, status: 'activo' },
    { atletaId: 2, dorsal: '2', nombre: 'B', genero: 'M', categoriaId: 'cat-A', olaId: 'ola-1', lugarCategoria: 2, tiempoNeto: 3_700_000, status: 'activo' },
    { atletaId: 3, dorsal: '3', nombre: 'C', genero: 'F', categoriaId: 'cat-B', olaId: 'ola-3', lugarCategoria: 1, tiempoNeto: 3_500_000, status: 'activo' },
    { atletaId: 4, dorsal: '4', nombre: 'D', genero: 'M', categoriaId: 'cat-A', olaId: 'ola-2', lugarCategoria: null, tiempoNeto: null, status: 'dnf' },
  ]

  beforeEach(() => {
    autoTableMock.mockClear()
    addPageMock.mockClear()
    saveMock.mockClear()
    textMock.mockClear()
    setPageMock.mockClear()
    getNumberOfPagesMock.mockReturnValue(3)
  })

  it('adds one page per non-empty (categoria, ola) combo (cover stays as page 1)', async () => {
    const { exportarResultadosCompletoPDF } = await import('../../src/utils/pdf')
    await exportarResultadosCompletoPDF(eventoMulti, filasMulti)
    // cat-A/ola-1 has 2 finishers, cat-B/ola-3 has 1; cat-A/ola-2 has only a dnf → skipped
    expect(addPageMock).toHaveBeenCalledTimes(2)
    expect(autoTableMock).toHaveBeenCalledTimes(2)
  })

  it('sorts each section body by lugarCategoria ascending', async () => {
    const { exportarResultadosCompletoPDF } = await import('../../src/utils/pdf')
    await exportarResultadosCompletoPDF(eventoMulti, filasMulti)
    const firstSection = autoTableMock.mock.calls[0][1]
    expect(firstSection.head[0]).toEqual(['Lugar', 'Dorsal', 'Nombre', 'Género', 'Tiempo'])
    expect(firstSection.body.map(r => r[1])).toEqual(['1', '2']) // dorsales in rank order
    expect(firstSection.body[0][4]).toBe('01:00:00')
  })

  it('saves with completo filename and ignores filtered status', async () => {
    const { exportarResultadosCompletoPDF } = await import('../../src/utils/pdf')
    await exportarResultadosCompletoPDF(eventoMulti, filasMulti)
    expect(saveMock).toHaveBeenCalledWith('resultados_completo_Carrera_Multi.pdf')
  })

  it('produces only a cover (no addPage) when no finishers exist', async () => {
    const { exportarResultadosCompletoPDF } = await import('../../src/utils/pdf')
    await expect(exportarResultadosCompletoPDF(eventoMulti, [])).resolves.not.toThrow()
    expect(addPageMock).not.toHaveBeenCalled()
    expect(autoTableMock).not.toHaveBeenCalled()
    expect(saveMock).toHaveBeenCalled()
  })

  it('falls back to "Salida única" section when categoria has no olas', async () => {
    const eventoNoOlas = {
      nombre: 'Solo Cat',
      lugar: 'X',
      fecha: '2026-05-21',
      tipo: '10K',
      categorias: [{ id: 'cat-A', nombre: 'General', olas: [] }],
    }
    const filas = [
      { atletaId: 1, dorsal: '7', nombre: 'Z', genero: 'M', categoriaId: 'cat-A', olaId: null, lugarCategoria: 1, tiempoNeto: 1_800_000, status: 'activo' },
    ]
    const { exportarResultadosCompletoPDF } = await import('../../src/utils/pdf')
    await exportarResultadosCompletoPDF(eventoNoOlas, filas)
    expect(addPageMock).toHaveBeenCalledTimes(1)
    expect(textMock).toHaveBeenCalledWith('Salida única', 14, 30)
  })

  it('writes a footer with page numbers across every page', async () => {
    getNumberOfPagesMock.mockReturnValue(2)
    const { exportarResultadosCompletoPDF } = await import('../../src/utils/pdf')
    await exportarResultadosCompletoPDF(eventoMulti, filasMulti)
    expect(setPageMock).toHaveBeenCalledWith(1)
    expect(setPageMock).toHaveBeenCalledWith(2)
    const pageLabelCalls = textMock.mock.calls.filter(c => typeof c[0] === 'string' && c[0].startsWith('Página '))
    expect(pageLabelCalls.length).toBeGreaterThanOrEqual(2)
  })
})
