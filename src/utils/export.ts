import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export function exportEntriesAsXlsx(entries: any[], fileName = 'habits.xlsx') {
  const worksheet = XLSX.utils.json_to_sheet(entries)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Entries')
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName)
}
