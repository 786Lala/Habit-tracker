// src/components/AdvancedPage.tsx
import React from 'react'
import CalendarView from './CalendarView'
import { entriesToICS, downloadICS } from '../utils/exportToICS'
import { downloadCSV } from '../utils/csv'
import ImportCSVModal from './ImportCSVModal'
import {openWeeklyPrint} from '../utils/weeklyPdf'


const TEMPLATE_SET = [
  { name: 'Daily Walk', unit: 'steps', daily_goal: 10000, color: '#14C38E' },
  { name: 'Reading', unit: 'minutes', daily_goal: 30, color: '#7EE7C6' },
  { name: 'Water Intake', unit: 'ml', daily_goal: 2000, color: '#00B0FF' },
  { name: 'Recycle', unit: 'grams', daily_goal: 300, color: '#FFD75A' }
]

function addHabitFromTemplate(tpl:any) {
  const key = 'hj_local_habits'
  const local = JSON.parse(localStorage.getItem(key) || '[]')
  const id = `local_${Date.now()}_${Math.floor(Math.random()*9999)}`
  const h = { id, name: tpl.name, unit: tpl.unit, daily_goal: tpl.daily_goal, color: tpl.color, local: true, created_at: new Date().toISOString() }
  local.unshift(h)
  localStorage.setItem(key, JSON.stringify(local))
  window.dispatchEvent(new Event('hj:updated'))
}

export default function AdvancedPage() {
  const [tplOpen, setTplOpen] = React.useState(false)
  const [importOpen, setImportOpen] = React.useState(false)

  function exportICSAll() {
    const entries = JSON.parse(localStorage.getItem('hj_local_entries') || '[]')
    const habits = JSON.parse(localStorage.getItem('hj_local_habits') || '[]')
    const ics = entriesToICS(entries, habits)
    downloadICS(ics, 'habit-entries.ics')
  }

  function exportEntriesCSV() {
    const entries = JSON.parse(localStorage.getItem('hj_local_entries') || '[]')
    downloadCSV(entries, 'entries.csv')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Workspace</h2>
          <div className="text-sm text-muted">Calendar, exports and insights</div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setTplOpen(true)} className="px-3 py-2 rounded bg-white/5">Use Template</button>
          <button onClick={() => setImportOpen(true)} className="px-3 py-2 rounded bg-white/5">Import CSV</button>
          <button onClick={exportEntriesCSV} className="px-3 py-2 rounded bg-white/5">Export Entries CSV</button>
          <button onClick={exportICSAll} className="px-3 py-2 rounded bg-white/5">Export Calendar (.ics)</button>
          <button onClick={()=>openWeeklyPrint()} className="px-3 py-2 rounded bg-white/5">Print Weekly PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card frost-card p-6">
            <CalendarView />
          </div>

          <div className="card frost-card p-6 mt-6">
            <h3 className="text-lg font-semibold">Activity Insight</h3>
            <WeeklyInsight />
          </div>
        </div>

        <aside>
          <div className="card frost-card p-6 mb-4">
            <h4 className="text-sm font-semibold">Tips & Suggestions</h4>
            <ul className="mt-3 text-sm text-muted space-y-2">
              <li>• Use Templates to add common habits quickly.</li>
              <li>• Export .ics and import into Google Calendar.</li>
              <li>• CSV export/import available for entries and habits.</li>
            </ul>
          </div>

          <div className="card frost-card p-6">
            <h4 className="text-sm font-semibold">Preview image</h4>
            <img src="/mnt/data/2133ea0a-746d-4fad-afea-bf4751451f11.png" alt="mock" className="mt-3 rounded" />
          </div>
        </aside>
      </div>

      {/* Template modal */}
      {tplOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div onClick={() => setTplOpen(false)} className="absolute inset-0 bg-black/50" />
          <div className="relative bg-[#0f1724] p-6 rounded-2xl w-full max-w-md text-white">
            <h3 className="text-xl mb-4">Templates</h3>
            <div className="grid gap-3">
              {TEMPLATE_SET.map(t => (
                <div key={t.name} className="p-3 rounded bg-white/4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-sm text-muted">{t.daily_goal} {t.unit}</div>
                  </div>
                  <button onClick={() => { addHabitFromTemplate(t); setTplOpen(false) }} className="px-3 py-2 rounded bg-gradient-to-r from-[#7EE7C6] to-[#14C38E] text-black">Use</button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setTplOpen(false)} className="px-3 py-2 rounded bg-white/5">Close</button>
            </div>
          </div>
        </div>
      )}

      <ImportCSVModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}

/* small insight component */
function WeeklyInsight() {
  const [summary, setSummary] = React.useState({ topHabit: '—', count: 0 })
  React.useEffect(() => {
    const entries = JSON.parse(localStorage.getItem('hj_local_entries') || '[]') as any[]
    const habits = JSON.parse(localStorage.getItem('hj_local_habits') || '[]')
    const last7 = new Set(Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().slice(0, 10)
    }))
    const counts: Record<string, number> = {}
    for (const e of entries) if (last7.has(e.entry_date)) counts[e.habit_id] = (counts[e.habit_id] || 0) + 1
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    if (top) {
      const habit = habits.find((h: any) => h.id === top[0])
      setSummary({ topHabit: habit?.name ?? 'Unknown', count: top[1] })
    } else setSummary({ topHabit: 'No data', count: 0 })
  }, [])
  return (
    <div className="mt-3">
      <div className="font-semibold">Top this week</div>
      <div className="text-muted mt-1">{summary.topHabit} • {summary.count} entries</div>
    </div>
  )
}
