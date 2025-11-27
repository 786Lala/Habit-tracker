// src/components/DashboardSuggestions.tsx
import React from 'react'
import { Button } from 'react' // optional, otherwise use simple button classes

type HabitSuggest = { title: string; reason?: string }

function localSuggestionEngine(habits:any[], entries:any[]) : HabitSuggest[] {
  // crude logic:
  // - if no exercise habits, suggest walking
  // - if user has low streaks, recommend small habit
  const suggestions: HabitSuggest[] = []
  const names = (habits||[]).map((h:any)=>h.name?.toLowerCase())
  if (!names.includes('meditate')) suggestions.push({ title: 'Meditate 5 min', reason: 'Small daily reset to increase focus' })
  if (!names.includes('walk') && !names.includes('steps')) suggestions.push({ title: 'Walk 30 mins', reason: 'Boost energy & mood' })
  // detect low energy via low entries frequency
  const counts: Record<string, number> = {}
  (entries||[]).forEach((e:any) => { counts[e.habit_id] = (counts[e.habit_id] || 0) + 1 })
  const low = Object.entries(counts).filter(([,c]) => c < 3)
  if (low.length > 0 && suggestions.length < 3) suggestions.push({ title: 'Hydrate: 500ml between meals', reason: 'Hydration improves energy' })
  return suggestions.slice(0,3)
}

export default function DashboardSuggestions({ onAdd }: { onAdd?: (tpl: any)=>void }) {
  const [suggests, setSuggests] = React.useState<HabitSuggest[]|null>(null)
  const [loading, setLoading] = React.useState(false)

  async function fetchSuggestions() {
    setLoading(true)
    try {
      // attempt placeholder AI endpoint (replace it if you provide real one)
      const res = await fetch('/api/ai/suggest', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ hint: 'habit-suggestions', max:3 }) })
      if (res.ok) {
        const data = await res.json()
        // expect data.suggestions = [{title, reason}]
        if (Array.isArray(data.suggestions)) { setSuggests(data.suggestions); setLoading(false); return }
      }
    } catch (err) {
      // ignore
    }

    // fallback: local generator based on localStorage
    const habits = JSON.parse(localStorage.getItem('hj_local_habits') || '[]')
    const entries = JSON.parse(localStorage.getItem('hj_local_entries') || '[]')
    const local = localSuggestionEngine(habits, entries)
    setSuggests(local)
    setLoading(false)
  }

  React.useEffect(()=> { fetchSuggestions() }, [])

  if (!suggests) return <div className="p-4">Loading suggestions...</div>

  return (
    <div className="p-4 bg-white/3 rounded">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Suggested habits</div>
        <div className="text-xs text-muted">AI-ish</div>
      </div>

      <div className="space-y-2">
        {suggests.map((s, i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5">
            <div>
              <div className="font-medium">{s.title}</div>
              <div className="text-xs text-muted">{s.reason ?? 'Smart suggestion'}</div>
            </div>
            <button onClick={() => {
              // simple add: create local habit from suggestion
              const id = `local_${Date.now()}_${Math.floor(Math.random()*9999)}`
              const h = { id, name: s.title, unit: '', daily_goal: null, color: '#FFD75A', local: true, created_at: new Date().toISOString() }
              const cur = JSON.parse(localStorage.getItem('hj_local_habits') || '[]')
              cur.unshift(h); localStorage.setItem('hj_local_habits', JSON.stringify(cur))
              window.dispatchEvent(new Event('hj:updated'))
              onAdd?.(h)
            }} className="px-3 py-1 rounded bg-gradient-to-r from-[#7EE7C6] to-[#14C38E] text-black text-sm">Add</button>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-muted">Tip: click “Prompt me ideas?” on empty state to ask for more.</div>
    </div>
  )
}
