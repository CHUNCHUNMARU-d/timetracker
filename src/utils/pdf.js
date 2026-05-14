import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { msAHora } from './tiempo'

export function exportarResultadosPDF(evento, filas) {
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
    headStyles: { fillColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  })

  doc.save(`resultados_${evento.nombre.replace(/\s+/g, '_')}.pdf`)
}
