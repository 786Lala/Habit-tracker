// src/components/EmptyStateSloth.tsx
import React from 'react'
import DashboardSuggestions from './DashboardSuggestions'

export default function EmptyStateSloth({ onPrompt }: { onPrompt?: ()=>void }) {
  const [ideas, setIdeas] = React.useState<string[]|null>(null)
  const [loading, setLoading] = React.useState(false)

  async function promptIdeas() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/ideas', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ count:4 }) })
      if (res.ok) {
        const d = await res.json()
        if (Array.isArray(d.ideas)) { setIdeas(d.ideas); setLoading(false); onPrompt?.(); return }
      }
    } catch (e) { /* fallback */ }

    // fallback local quick ideas
    setIdeas(['Meditate 5 min', 'Brush teeth right after breakfast', 'Read 10 pages', '10 pushups before bed'])
    setLoading(false)
    onPrompt?.()
  }

  return (
    <div className="w-full p-6 rounded bg-white/4 flex flex-col items-center gap-4 text-center">
      {/* inline sloth svg */}
      <svg width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="80" cy="90" rx="70" ry="18" fill="#0b1220" opacity="0.12"/>
        <g>
          <ellipse cx="80" cy="40" rx="46" ry="36" fill="#F6F0E6"/>
          <circle cx="62" cy="34" r="6" fill="#3b3027"/>
          <circle cx="98" cy="34" r="6" fill="#3b3027"/>
          <path d="M46 52c0 12 18 26 34 26s34-14 34-26" stroke="#3b3027" strokeWidth="2" strokeLinecap="round"/>
        </g>
      </svg>

      <div className="text-lg font-bold">Meet Slothy — your habit buddy</div>
      <div className="text-sm text-muted max-w-xl">Start by creating your first habit. Need ideas? Slothy can prompt you creative, tiny habits that you can actually keep.</div>

      <div className="flex gap-3">
        <button onClick={promptIdeas} disabled={loading} className="px-4 py-2 rounded bg-gradient-to-r from-[#7EE7C6] to-[#14C38E] text-black">
          {loading ? 'Thinking...' : 'Prompt me ideas?'}
        </button>
        <button onClick={() => { window.dispatchEvent(new CustomEvent('nav:add-habit')) }} className="px-4 py-2 rounded bg-white/6">Create habit</button>
      </div>

      {ideas && (
        <div className="mt-4 w-full">
          <div className="text-sm font-semibold mb-2">Quick ideas</div>
          <div className="grid gap-2">
            {ideas.map((it, idx) => <div key={idx} className="p-3 rounded bg-white/5 flex items-center justify-between">
              <div>{it}</div>
              <button onClick={() => {
                const id = `local_${Date.now()}_${Math.floor(Math.random()*9999)}`
                const h = { id, name: it, unit: '', daily_goal: null, color: '#FFD75A', local: true, created_at: new Date().toISOString() }
                const cur = JSON.parse(localStorage.getItem('hj_local_habits') || '[]'); cur.unshift(h); localStorage.setItem('hj_local_habits', JSON.stringify(cur))
                window.dispatchEvent(new Event('hj:updated'))
              }} className="px-2 py-1 rounded bg-white/6 text-sm">Add</button>
            </div>)}
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-muted">Tip: these are tiny actions — small wins = big momentum.</div>
    </div>
  )
}
