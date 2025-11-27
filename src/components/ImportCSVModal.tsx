// src/components/ImportCSVModal.tsx
import React from 'react'

type Props = { open: boolean; onClose: ()=>void }

function parseCSV(text: string) {
  // very small CSV parser:
  // - assumes first line header
  // - supports quoted values with double quotes escaping
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return { header: [], rows: [] }
  const header = splitLine(lines[0])
  const rows = lines.slice(1).map(l => {
    const cols = splitLine(l)
    const obj: any = {}
    for (let i=0;i<header.length;i++) obj[header[i]] = cols[i] ?? ''
    return obj
  })
  return { header, rows }

  function splitLine(line: string) {
    const out: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i=0;i<line.length;i++) {
      const ch = line[i]
      if (ch === '"' ) {
        if (inQuotes && line[i+1] === '"') { cur += '"'; i++; continue }
        inQuotes = !inQuotes
        continue
      }
      if (ch === ',' && !inQuotes) {
        out.push(cur); cur = ''; continue
      }
      cur += ch
    }
    out.push(cur)
    return out.map(s => s.trim())
  }
}

export default function ImportCSVModal({ open, onClose }: Props) {
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [preview, setPreview] = React.useState<{ header: string[]; rows: any[] } | null>(null)
  const [target, setTarget] = React.useState<'entries'|'habits'>('entries')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setFileName(null); setPreview(null); setTarget('entries'); setError(null)
    }
  }, [open])

  async function handleFile(f: File | null) {
    setError(null)
    if (!f) return
    setFileName(f.name)
    const text = await f.text()
    const parsed = parseCSV(text)
    setPreview(parsed)
  }

  function applyImport() {
    if (!preview) { setError('No file parsed'); return }
    try {
      if (target === 'entries') {
        const key = 'hj_local_entries'
        const existing = JSON.parse(localStorage.getItem(key) || '[]')
        const mapped = preview.rows.map((r:any) => {
          // tolerant to common column names
          const id = r.id || `local_e_${Date.now()}_${Math.floor(Math.random()*9999)}`
          const habit_id = r.habit_id || r.habit || r.habitId || r.habitID
          const value = Number(r.value ?? r.val ?? r.amount ?? 0)
          const entry_date = (r.entry_date || r.date || '').slice(0,10) // expect YYYY-MM-DD
          return { id, habit_id, value, entry_date, created_at: new Date().toISOString(), local: true }
        })
        localStorage.setItem(key, JSON.stringify([...mapped, ...existing]))
        window.dispatchEvent(new Event('hj:updated'))
        onClose()
      } else {
        const key = 'hj_local_habits'
        const existing = JSON.parse(localStorage.getItem(key) || '[]')
        const mapped = preview.rows.map((r:any) => {
          const id = r.id || `local_${Date.now()}_${Math.floor(Math.random()*9999)}`
          const name = r.name || r.title || r.habit || 'Unnamed'
          const unit = r.unit || r.u || 'units'
          const daily_goal = r.daily_goal ? Number(r.daily_goal) : (r.goal ? Number(r.goal) : null)
          const color = r.color || '#14C38E'
          return { id, name, unit, daily_goal, color, local: true, created_at: new Date().toISOString() }
        })
        localStorage.setItem(key, JSON.stringify([...mapped, ...existing]))
        window.dispatchEvent(new Event('hj:updated'))
        onClose()
      }
    } catch (err: any) {
      setError(err?.message ?? 'Import failed')
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative bg-[#0f1724] p-6 rounded-2xl w-full max-w-2xl text-white">
        <h3 className="text-xl mb-3">Import CSV</h3>
        {error && <div className="text-sm text-red-400 mb-3">{error}</div>}

        <div className="flex items-center gap-3 mb-4">
          <input type="file" accept=".csv" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          <select value={target} onChange={e => setTarget(e.target.value as any)} className="bg-white/5 p-2 rounded">
            <option value="entries">Entries (rows with habit_id, value, entry_date)</option>
            <option value="habits">Habits (name, unit, daily_goal)</option>
          </select>
          <div className="text-sm text-muted">{fileName ?? 'No file'}</div>
        </div>

        {preview && (
          <div className="mb-4">
            <div className="text-sm text-muted">Preview (first 5 rows)</div>
            <div className="mt-2 overflow-auto max-h-48">
              <table className="w-full text-xs">
                <thead><tr>{preview.header.map(h => <th key={h} className="text-left pr-3">{h}</th>)}</tr></thead>
                <tbody>
                  {preview.rows.slice(0,5).map((r,i) => <tr key={i}><td colSpan={preview.header.length} className="p-2 text-muted">{JSON.stringify(r)}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-2 rounded bg-white/5">Cancel</button>
          <button onClick={applyImport} className="px-3 py-2 rounded bg-gradient-to-r from-[#7EE7C6] to-[#14C38E] text-black">Import</button>
        </div>
      </div>
    </div>
  )
}
