// src/utils/pdfReport.ts
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export async function exportInsightsAsPDF(filename = 'habit-insights.pdf') {
  const root = document.getElementById('insights-report')
  if (!root) { alert('No insights area found.'); return }
  // render at high resolution
  const canvas = await html2canvas(root, { scale: 2 })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgProps = (pdf as any).getImageProperties(imgData)
  const imgWidth = pageWidth - 40
  const imgHeight = (imgProps.height * imgWidth) / imgProps.width
  pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight)
  pdf.save(filename)
}
