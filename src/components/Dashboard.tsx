// src/components/Dashboard.tsx
import QuickAddEntry from './QuickAddEntry'
import React from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

type Habit = { id: string; name: string; unit: string; daily_goal: number | null; created_at?: string; local?: boolean; color?: string }
type Entry = { id: string; habit_id: string; value: number; entry_date: string; created_at?: string }

function getLastNDates(n: number) {
  const arr: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    arr.push(d.toISOString().slice(0, 10))
  }
  return arr
}

const COLORS = ['#14C38E', '#7EE7C6', '#FFD75A', '#6C5CE7', '#00B0FF', '#FF7A7A', '#A29BFE']

export default function Dashboard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [habits, setHabits] = React.useState<Habit[]>([])
  const [entries, setEntries] = React.useState<Entry[]>([])
  const [loading, setLoading] = React.useState(false)
  const [quickOpen, setQuickOpen] = React.useState(false)
  const localHabitsKey = 'hj_local_habits'
  const localEntriesKey = 'hj_local_entries'

  React.useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const { data: habitsData, error: habitsErr } = await supabase.from('habits').select('*').order('created_at', { ascending: false })
        const remoteHabits = (habitsErr ? [] : (habitsData as any)) ?? []

        const { data: entriesData, error: entriesErr } = await supabase.from('entries').select('*').order('entry_date', { ascending: false }).limit(500)
        const remoteEntries = (entriesErr ? [] : (entriesData as any)) ?? []

        const localHabits = JSON.parse(localStorage.getItem(localHabitsKey) ?? '[]') as Habit[]
        const mergedHabits = [...localHabits, ...remoteHabits]
        const localEntries = JSON.parse(localStorage.getItem(localEntriesKey) ?? '[]') as Entry[]
        const mergedEntries = [...localEntries, ...remoteEntries]

        if (mounted) {
          setHabits(mergedHabits)
          setEntries(mergedEntries)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [refreshKey])

  // Active habits
  const activeHabits = habits.length

  // Pie: sum of values per habit (over last 7 days)
  const last7dates = getLastNDates(7)
  const entriesLast7 = entries.filter(e => last7dates.includes(e.entry_date))
  const sumsByHabit: Record<string, number> = {}
  for (const e of entriesLast7) {
    sumsByHabit[e.habit_id] = (sumsByHabit[e.habit_id] ?? 0) + Number(e.value)
  }
  const pieData = habits.map((h, i) => ({ name: h.name, value: sumsByHabit[h.id] ?? 0, color: h.color ?? COLORS[i % COLORS.length] })).filter(d => d.value > 0)

  // Bar: counts per day
  const counts = last7dates.map(d => ({ date: d.slice(5), count: entries.filter(e => e.entry_date === d).length }))

  // Timeline recent entries
  const timeline = [...entries].sort((a,b) => (b.entry_date > a.entry_date ? 1 : -1)).slice(0, 12)

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="card frost-card glow">
            <div className="text-sm text-muted">Completion</div>
            <div className="text-2xl font-bold mt-2">
              {/* compute a simple completion: percent of entries meeting goals in last 7 days */}
              {(() => {
                let total = 0, ok = 0
                for (const e of entriesLast7) {
                  const h = habits.find(x => x.id === e.habit_id)
                  if (!h || h.daily_goal == null) continue
                  total++
                  if (Number(e.value) >= Number(h.daily_goal)) ok++
                }
                if (total === 0) return '—'
                return `${Math.round((ok/total)*100)}%`
              })()}
            </div>
            <div className="text-xs text-muted mt-2">Last 7 days</div>
          </div>

          <div className="card frost-card">
            <div className="text-sm text-muted">Active Habits</div>
            <div className="text-2xl font-bold mt-2">{activeHabits}</div>
            <div className="text-xs text-muted mt-2">Local + synced</div>
          </div>

          <div className="card frost-card">
            <div className="text-sm text-muted">Tracked Days</div>
            <div className="text-2xl font-bold mt-2">{new Set(entries.map(e => e.entry_date)).size}</div>
            <div className="text-xs text-muted mt-2">Unique days recorded</div>
          </div>
        </div>

        <div className="card frost-card flex gap-6 items-center" style={{ minHeight: 260 }}>
          <div className="w-1/2">
            <div className="text-sm text-muted mb-2">Weekly Activity</div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={counts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" tick={{ fill: '#cfeee0' }} />
                  <YAxis tick={{ fill: '#cfeee0' }} />
                  <Tooltip wrapperStyle={{ background: '#07121a', border: 'none' }} />
                  <Bar dataKey="count" fill="#14C38E" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex-1">
            <div className="text-sm text-muted">Activity share (last 7d)</div>
            <div style={{ width: '100%', height: 220 }} className="mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={36} outerRadius={80} paddingAngle={4}>
                    {pieData.map((entry, idx) => <Cell key={`c-${idx}`} fill={entry.color} />)}
                  </Pie>
                  <ReTooltip wrapperStyle={{ background: '#07121a', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card frost-card">
          <div className="text-sm text-muted mb-4">History / Timeline</div>
          <ul className="space-y-3 text-gray-100">
            {timeline.length === 0 && <li className="text-gray-400">No entries yet</li>}
            {timeline.map(t => {
              const habit = habits.find(h => h.id === t.habit_id)
              return (
                <li key={t.id} className="flex justify-between">
                  <div className="text-sm">{t.entry_date} • {habit?.name ?? 'Unknown'}</div>
                  <div className="text-sm text-muted">{t.value} {habit?.unit ?? ''}</div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <aside>
        <aside>
  <div className="card frost-card">
    <div className="text-sm text-muted">Actions</div>
    <div className="mt-4 grid grid-cols-1 gap-3">
      <button onClick={() => setQuickOpen(true)} className="p-3 rounded bg-white/4 text-left">Quick Add Entry</button>
      <button onClick={() => { window.dispatchEvent(new CustomEvent('nav:habits')); }} className="p-3 rounded bg-white/4 text-left">Open Habits</button>
    </div>
  </div>
</aside>

        
      </aside>
    </section>
  )
}
