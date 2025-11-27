// src/components/InsightsCard.tsx
import React from 'react'
export default function InsightsCard(){
  const entries = JSON.parse(localStorage.getItem('hj_local_entries') || '[]')
  const habits = JSON.parse(localStorage.getItem('hj_local_habits') || '[]')
  // compute counts per habit last 7 days
  const last7 = new Set(Array.from({length:7}).map((_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-i); return d.toISOString().slice(0,10)
  }))
  const counts: Record<string, number> = {}
  for(const e of entries){ if(last7.has(e.entry_date)){ counts[e.habit_id] = (counts[e.habit_id]||0)+1 } }
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]
  const topHabit = top ? (habits.find((h:any)=>h.id===top[0])?.name || '—') : 'No data'
  return (
    <div className="card frost-card p-4">
      <div className="text-sm text-muted">Weekly Insight</div>
      <div className="mt-2">
        <div className="font-semibold">Top habit: {topHabit}</div>
        <div className="text-sm text-muted mt-1">{top ? `You logged this ${top[1]} times in last 7 days` : 'No entries yet — try Quick Add Entry'}</div>
      </div>
    </div>
  )
}
