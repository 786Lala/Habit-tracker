// src/components/CalendarView.tsx
import React from 'react'
import { supabase } from '../lib/supabase'

type Habit = { id: string; name: string; color?: string; unit?: string; local?: boolean }
type Entry = { id: string; habit_id: string; value: number; entry_date: string; created_at?: string; local?: boolean }

function daysInMonth(year:number, month:number){ return new Date(year, month+1, 0).getDate() }
function startWeekday(year:number, month:number){ return new Date(year, month, 1).getDay() }

export default function CalendarView(){
  const [habits, setHabits] = React.useState<Habit[]>([])
  const [entries, setEntries] = React.useState<Entry[]>([])
  const [year, setYear] = React.useState<number>((new Date()).getFullYear())
  const [month, setMonth] = React.useState<number>((new Date()).getMonth())
  const [selectedDay, setSelectedDay] = React.useState<string|null>(null)
  const [viewMode, setViewMode] = React.useState<'month'|'week'>('month')

  const localHabitsKey = 'hj_local_habits'
  const localEntriesKey = 'hj_local_entries'

  // load local first, then merge remote best-effort
  async function loadAll() {
    try {
      const localHabits = JSON.parse(localStorage.getItem(localHabitsKey) || '[]') as Habit[]
      const localEntries = JSON.parse(localStorage.getItem(localEntriesKey) || '[]') as Entry[]
      setHabits(localHabits)
      setEntries(localEntries)

      // best-effort remote fetch but do not override local objects
      try {
        const rh = await supabase.from('habits').select('*')
        const re = await supabase.from('entries').select('*').limit(2000)
        const remoteHab = (rh?.data ?? []) as Habit[]
        const remoteEnt = (re?.data ?? []) as Entry[]
        setHabits(prev => [...localHabits, ...remoteHab.filter(r => !localHabits.find(l => l.id === r.id))])
        setEntries(prev => [...localEntries, ...remoteEnt.filter(r => !localEntries.find(l => l.id === r.id))])
      } catch(e){ /* silent */ }
    } catch (err) {
      console.warn('Calendar load failed', err)
    }
  }

  React.useEffect(() => {
    loadAll()
    function onUpdated(){ loadAll() }
    window.addEventListener('hj:updated', onUpdated)
    window.addEventListener('storage', (e)=> {
      if (e.key === localHabitsKey || e.key === localEntriesKey) loadAll()
    })
    return () => {
      window.removeEventListener('hj:updated', onUpdated)
    }
  }, [])

  // index entries by date
  const entriesByDate: Record<string, Entry[]> = {}
  for (const ent of entries) {
    const d = ent.entry_date
    if (!d) continue
    (entriesByDate[d] ??= []).push(ent)
  }

  // helpers
  const monthDays = daysInMonth(year, month)
  const startDay = startWeekday(year, month)
  const today = new Date()
  const isoToday = today.toISOString().slice(0,10)
  function dateKeyForDay(d:number) { return new Date(year, month, d).toISOString().slice(0,10) }
  function habitColor(hid:string) { const h = habits.find(hh => hh.id === hid); return h?.color ?? '#14C38E' }
  function prevMonth(){ const d = new Date(year, month-1, 1); setYear(d.getFullYear()); setMonth(d.getMonth()) }
  function nextMonth(){ const d = new Date(year, month+1, 1); setYear(d.getFullYear()); setMonth(d.getMonth()) }

  // WEEK view helpers: compute start of week containing selected reference (default today)
  function weekStartOf(dateRef: Date) {
    const d = new Date(dateRef)
    const day = d.getDay()
    d.setDate(d.getDate() - day) // Sunday
    d.setHours(0,0,0,0)
    return d
  }
  function makeWeekDates(anchor?: string) {
    const ref = anchor ? new Date(anchor) : new Date()
    const start = weekStartOf(ref)
    const arr: string[] = []
    for (let i=0;i<7;i++){ const cur = new Date(start); cur.setDate(start.getDate()+i); arr.push(cur.toISOString().slice(0,10)) }
    return arr
  }

  // UI rendering helpers
  function renderMonthGrid() {
    const cells: JSX.Element[] = []
    // pad
    for (let i=0;i<startDay;i++) cells.push(<div key={`pad-${i}`} />)
    for (let i=0;i<monthDays;i++){
      const day = i+1
      const dKey = dateKeyForDay(day)
      const dayEntries = (entriesByDate[dKey] ?? []).slice(0,4)
      const isToday = dKey === isoToday
      cells.push((
        <div key={`m-${dKey}`} className={`p-3 rounded-lg frost-card min-h-[96px] relative group ${isToday ? 'ring-2 ring-[#14C38E]/20' : ''}`}>
          <div className="flex items-start justify-between">
            <div className="text-sm font-medium">{day}</div>
            {dayEntries.length > 0 && <div className="text-xs px-2 py-0.5 rounded bg-white/5">{dayEntries.length}</div>}
          </div>

          <div className="mt-2 space-y-1 max-h-[64px] overflow-hidden">
            {dayEntries.map(en => {
              const habit = habits.find(h => h.id === en.habit_id)
              return (
                <div key={en.id} className="flex items-center gap-2 text-xs">
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: habitColor(en.habit_id) }} />
                  <div className="truncate"><strong className="text-white/90">{habit?.name ?? 'Habit'}</strong> <span className="text-muted">• {en.value}{habit?.unit ? ` ${habit.unit}` : ''}</span></div>
                </div>
              )
            })}
          </div>

          <button onClick={() => setSelectedDay(dKey)} className="absolute right-2 bottom-2 text-xs text-muted">View</button>

          {/* hover tooltip */}
          <div className="absolute left-2 top-8 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition duration-150 z-20">
            {dayEntries.length > 0 && (
              <div className="rounded bg-black/80 text-xs p-2 text-white shadow max-w-xs">
                {dayEntries.map(d => {
                  const habit = habits.find(h => h.id === d.habit_id)
                  return <div key={d.id}>{(habit?.name ?? 'Habit')} — {d.value}{habit?.unit ? ` ${habit.unit}` : ''}</div>
                })}
              </div>
            )}
          </div>
        </div>
      ))
    }
    return (<div className="grid grid-cols-7 gap-2">{cells}</div>)
  }

  function renderWeekGrid(anchor?: string) {
    const weekDates = makeWeekDates(anchor)
    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map(dKey => {
          const dateObj = new Date(dKey)
          const dayNum = dateObj.getDate()
          const dayEntries = (entriesByDate[dKey] ?? []).slice(0,6)
          const isToday = dKey === isoToday
          return (
            <div key={`w-${dKey}`} className={`p-3 rounded-lg frost-card min-h-[120px] relative group ${isToday ? 'ring-2 ring-[#14C38E]/20' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium">{dateObj.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                  <div className="text-xs text-muted">{dayNum}</div>
                </div>
                {dayEntries.length > 0 && <div className="text-xs px-2 py-0.5 rounded bg-white/5">{dayEntries.length}</div>}
              </div>

              <div className="mt-3 space-y-2 overflow-auto max-h-[84px]">
                {dayEntries.map(en => {
                  const habit = habits.find(h => h.id === en.habit_id)
                  return (
                    <div key={en.id} className="flex items-center gap-2 text-sm">
                      <div style={{ width: 10, height: 10, borderRadius: 4, background: habitColor(en.habit_id) }} />
                      <div className="truncate"><strong className="text-white/90">{habit?.name ?? 'Habit'}</strong> <span className="text-muted">• {en.value}{habit?.unit ? ` ${habit.unit}` : ''}</span></div>
                    </div>
                  )
                })}
                {dayEntries.length === 0 && (<div className="text-sm text-muted">No entries</div>)}
              </div>

              <button onClick={() => setSelectedDay(dKey)} className="absolute right-2 bottom-2 text-xs text-muted">View</button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">{viewMode === 'month' ? new Date(year, month).toLocaleString(undefined, { month: 'long', year: 'numeric' }) : 'Week view'}</div>
        <div className="flex items-center gap-2">
          {viewMode === 'month' ? (
            <>
              <button onClick={prevMonth} className="px-2 py-1 rounded bg-white/5">Prev</button>
              <button onClick={nextMonth} className="px-2 py-1 rounded bg-white/5">Next</button>
            </>
          ) : (
            <>
              <button onClick={()=>{
                // go to previous week (anchor on first day of current week)
                const anchor = makeWeekDates()[0]
                const d = new Date(anchor); d.setDate(d.getDate() - 7)
                const y = d.getFullYear(); const m = d.getMonth()
                setYear(y); setMonth(m)
              }} className="px-2 py-1 rounded bg-white/5">Prev</button>
              <button onClick={()=>{
                const anchor = makeWeekDates()[0]
                const d = new Date(anchor); d.setDate(d.getDate() + 7)
                const y = d.getFullYear(); const m = d.getMonth()
                setYear(y); setMonth(m)
              }} className="px-2 py-1 rounded bg-white/5">Next</button>
            </>
          )}

          <div className="ml-4 bg-white/5 rounded p-1">
            <button onClick={() => setViewMode('month')} className={`px-2 py-1 rounded ${viewMode==='month' ? 'bg-white/10' : ''}`}>Month</button>
            <button onClick={() => setViewMode('week')} className={`px-2 py-1 rounded ${viewMode==='week' ? 'bg-white/10' : ''}`}>Week</button>
          </div>
        </div>
      </div>

      <div className="mb-3 text-sm text-muted">Legend:</div>
      <div className="flex gap-3 mb-4 flex-wrap">
        {habits.slice(0,8).map(h => (
          <div key={h.id} className="flex items-center gap-2 text-sm">
            <span style={{ width: 12, height: 12, background: h.color ?? '#14C38E', borderRadius: 6 }} />
            <span className="text-sm">{h.name}</span>
          </div>
        ))}
        {habits.length === 0 && <div className="text-sm text-muted">No habits yet</div>}
      </div>

      {/* week or month UI */}
      {viewMode === 'month' ? renderMonthGrid() : renderWeekGrid()}

      {/* Day modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div onClick={() => setSelectedDay(null)} className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-w-2xl p-6 rounded-2xl bg-[#07121a] text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">Entries — {selectedDay}</div>
              <button onClick={() => setSelectedDay(null)} className="px-3 py-1 rounded bg-white/5">Close</button>
            </div>

            <div className="space-y-3">
              {(entriesByDate[selectedDay] ?? []).length === 0 && <div className="text-muted">No entries on this day.</div>}
              {(entriesByDate[selectedDay] ?? []).map(e => {
                const habit = habits.find(h => h.id === e.habit_id)
                return (
                  <div key={e.id} className="p-3 rounded bg-white/4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{habit?.name ?? 'Habit'}</div>
                      <div className="text-sm text-muted">{e.value} {habit?.unit ?? ''} • {new Date(e.created_at ?? selectedDay).toLocaleTimeString()}</div>
                    </div>
                    <div>
                      <button onClick={() => {
                        if (!confirm('Delete this entry locally?')) return
                        const localEntries = JSON.parse(localStorage.getItem(localEntriesKey) || '[]') as Entry[]
                        const filtered = localEntries.filter(x => x.id !== e.id)
                        localStorage.setItem(localEntriesKey, JSON.stringify(filtered))
                        window.dispatchEvent(new Event('hj:updated'))
                        setSelectedDay(null)
                      }} className="px-2 py-1 rounded bg-red-700/40">Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
