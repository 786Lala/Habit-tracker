// src/utils/csv.ts
export function downloadCSV(data: any[], filename = 'export.csv') {
  if (!Array.isArray(data) || data.length === 0) {
    alert('No data to export.')
    return
  }

  // Build header from union of keys
  const keys = Array.from(data.reduce((set, row) => {
    Object.keys(row || {}).forEach(k => set.add(k))
    return set
  }, new Set<string>()))

  const lines = [keys.join(',')]
  for (const row of data) {
    const values = keys.map(k => {
      const v = row[k] ?? ''
      // escape quotes and commas
      const s = String(v).replace(/"/g, '""')
      return `"${s}"`
    })
    lines.push(values.join(','))
  }

  const csv = lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
