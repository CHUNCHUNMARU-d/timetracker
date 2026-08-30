import { msAHora } from './tiempo'

// jsPDF is ~350 kB and only needed when an operator exports. Loaded on demand so
// the timing screens ship without it; Workbox still precaches the chunk, so
// export keeps working offline.
async function cargarJsPDF() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  return { jsPDF, autoTable }
}

const SLATE_900 = [15, 23, 42]
const SLATE_100 = [241, 245, 249]
const PODIUM = {
  1: [253, 230, 138], // amber-200 (gold)
  2: [226, 232, 240], // slate-200 (silver)
  3: [254, 215, 170], // orange-200 (bronze)
}

export async function exportarResultadosPDF(evento, filas) {
  const { jsPDF, autoTable } = await cargarJsPDF()
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.text(evento.nombre, 14, 20)

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`${evento.lugar} · ${evento.fecha} · ${evento.tipo}`, 14, 28)
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 34)

  autoTable(doc, {
    startY: 42,
    head: [['#', 'Dorsal', 'Nombre', 'Categoría', 'Distancia', 'Tiempo', 'Cat.']],
    body: filas.map(f => [
      f.lugarGeneral,
      f.dorsal,
      f.nombre,
      f.categoria,
      f.distancia,
      msAHora(f.tiempoNeto),
      f.lugarCategoria,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: SLATE_900 },
    alternateRowStyles: { fillColor: SLATE_100 },
  })

  doc.save(`resultados_${evento.nombre.replace(/\s+/g, '_')}.pdf`)
}

export async function exportarResultadosCompletoPDF(evento, filas) {
  const { jsPDF, autoTable } = await cargarJsPDF()
  const doc = new jsPDF()
  const activos = filas.filter(f => (f.status ?? 'activo') === 'activo' && f.tiempoNeto != null)
  const generado = new Date().toLocaleString('es-MX')

  // ── Cover page ────────────────────────────────────────────────
  doc.setFontSize(26)
  doc.setTextColor(...SLATE_900)
  doc.text(evento.nombre, 14, 32)

  doc.setFontSize(12)
  doc.setTextColor(80)
  doc.text(`${evento.lugar} · ${evento.fecha}`, 14, 42)
  doc.text(evento.tipo ?? '', 14, 49)

  doc.setDrawColor(...SLATE_900)
  doc.setLineWidth(0.6)
  doc.line(14, 55, 196, 55)

  doc.setFontSize(14)
  doc.setTextColor(...SLATE_900)
  doc.text('Resultados oficiales', 14, 68)
  doc.text('por categoría y ola', 14, 76)

  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text(`Total finalistas: ${activos.length}`, 14, 92)
  doc.text(`Generado: ${generado}`, 14, 98)

  // ── One section per non-empty (categoria, ola) ───────────────
  const categorias = evento.categorias ?? []
  for (const cat of categorias) {
    const olas = (cat.olas?.length ? cat.olas : [{ id: null, nombre: null }])
    for (const ola of olas) {
      const rows = activos
        .filter(f => f.categoriaId === cat.id && (ola.id == null || f.olaId === ola.id))
        .sort((a, b) => (a.lugarCategoria ?? 9999) - (b.lugarCategoria ?? 9999))
      if (rows.length === 0) continue

      doc.addPage()
      doc.setFontSize(16)
      doc.setTextColor(...SLATE_900)
      doc.text(cat.nombre || 'Sin categoría', 14, 22)
      doc.setFontSize(11)
      doc.setTextColor(100)
      doc.text(ola.nombre ? `Ola: ${ola.nombre}` : 'Salida única', 14, 30)
      doc.setFontSize(9)
      doc.text(`${rows.length} finalistas`, 14, 36)

      autoTable(doc, {
        startY: 42,
        head: [['Lugar', 'Dorsal', 'Nombre', 'Género', 'Tiempo']],
        body: rows.map(r => [
          r.lugarCategoria ?? '—',
          r.dorsal,
          r.nombre,
          r.genero ?? '',
          msAHora(r.tiempoNeto),
        ]),
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: SLATE_900, textColor: 255 },
        alternateRowStyles: { fillColor: SLATE_100 },
        didParseCell: (data) => {
          if (data.section !== 'body') return
          const r = rows[data.row.index]
          const fill = PODIUM[r.lugarCategoria]
          if (fill) {
            data.cell.styles.fillColor = fill
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })
    }
  }

  // ── Footer on every page ────────────────────────────────────
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(140)
    doc.text(`${evento.nombre} · Generado ${generado}`, 14, 290)
    doc.text(`Página ${i} / ${total}`, 196, 290, { align: 'right' })
  }

  doc.save(`resultados_completo_${evento.nombre.replace(/\s+/g, '_')}.pdf`)
}
