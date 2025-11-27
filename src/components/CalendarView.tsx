// src/components/CalendarView.tsx
import React from 'react'
import { supabase } from '../lib/supabase'
import QuickAddEntry from './QuickAddEntry' // ensure this path matches your project
// If you don't have QuickAddEntry, you can stub a simple modal that opens to add entries.

type Habit = {
  id: string
  name: string
  color?: string
  unit?: string
  local?: boolean
  created_at?: string
  updated_at?: string
}

type Entry = {
  id: string
  habit_id: string
  value: number
  entry_date: string // YYYY-MM-DD
  created_at?: string
  updated_at?: string
  local?: boolean
}

const LOCAL_HABITS_KEY = 'hj_local_habits'
const LOCAL_ENTRIES_KEY = 'hj_local_entries'

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function startWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay() // 0=Sun
}

export default function CalendarView(): JSX.Element {
  const [habits, setHabits] = React.useState<Habit[]>([])
  const [entries, setEntries] = React.useState<Entry[]>([])
  const [year, setYear] = React.useState<number>((new Date()).getFullYear())
  const [month, setMonth] = React.useState<number>((new Date()).getMonth())
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<'month' | 'week'>('month')
  const [filterMap, setFilterMap] = React.useState<Record<string, boolean>>({})
  const [quickAddState, setQuickAddState] = React.useState<{ open: boolean; date?: string; habitId?: string }>({ open: false })
  const [loading, setLoading] = React.useState(false)

  // Load local first, then best-effort remote merge
  async function loadAll() {
    setLoading(true)
    try {
      const localHabits = JSON.parse(localStorage.getItem(LOCAL_HABITS_KEY) || '[]') as Habit[]
      const localEntries = JSON.parse(localStorage.getItem(LOCAL_ENTRIES_KEY) || '[]') as Entry[]

      setHabits(localHabits)
      setEntries(localEntries)

      // initialize filters if empty
      setFilterMap(prev => {
        if (Object.keys(prev).length === 0 && localHabits.length > 0) {
          const m: Record<string, boolean> = {}
          localHabits.forEach(h => { m[h.id] = true })
          return m
        }
        return prev
      })

      // best-effort: attempt remote fetch (do not block local UI)
      try {
        const [rh, re] = await Promise.all([
          supabase.from('habits').select('*'),
          supabase.from('entries').select('*').limit(2000)
        ])
        const remoteHabits = (rh?.data ?? []) as Habit[]
        const remoteEntries = (re?.data ?? []) as Entry[]

        // append remote items not present locally (do not overwrite local)
        setHabits(prev => {
          const existing = new Set(prev.map(p => p.id))
          const merged = [...prev, ...remoteHabits.filter(r => !existing.has(r.id))]
          // ensure filterMap has keys for new remote habits
          setFilterMap(fm => {
            const copy = { ...fm }
            merged.forEach(h => { if (copy[h.id] === undefined) copy[h.id] = true })
            return copy
          })
          return merged
        })
        setEntries(prev => {
          const existing = new Set(prev.map(p => p.id))
          return [...prev, ...remoteEntries.filter(r => !existing.has(r.id))]
        })
      } catch (er) {
        // ignore remote errors
        // console.warn('remote fetch failed', er)
      }
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadAll()
    function onUpdated() { loadAll() }
    window.addEventListener('hj:updated', onUpdated)
    window.addEventListener('storage', (e) => {
      if (e.key === LOCAL_HABITS_KEY || e.key === LOCAL_ENTRIES_KEY) loadAll()
    })
    return () => {
      window.removeEventListener('hj:updated', onUpdated)
      window.removeEventListener('storage', () => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // index entries by date for fast lookup
  const entriesByDate: Record<string, Entry[]> = {}
  for (const en of entries) {
    if (!en?.entry_date) continue
    ;(entriesByDate[en.entry_date] ??= []).push(en)
  }

  // helpers
  const monthDays = daysInMonth(year, month)
  const startDay = startWeekday(year, month)
  const todayISO = new Date().toISOString().slice(0, 10)

  function dateKeyForDay(day: number) {
    return new Date(year, month, day).toISOString().slice(0, 10)
  }
  function habitColor(hid: string) {
    const h = habits.find(x => x.id === hid)
    return h?.color ?? '#14C38E'
  }
  function prevMonth() {
    const d = new Date(year, month - 1, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
  }
  function nextMonth() {
    const d = new Date(year, month + 1, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
  }

  // week helpers (week anchored to Sunday)
  function weekStartOf(dateRef: Date) {
    const d = new Date(dateRef)
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    d.setHours(0, 0, 0, 0)
    return d
  }
  function makeWeekDates(anchorISO?: string) {
    const ref = anchorISO ? new Date(anchorISO) : new Date()
    const start = weekStartOf(ref)
    const arr: string[] = []
    for (let i = 0; i < 7; i++) {
      const cur = new Date(start)
      cur.setDate(start.getDate() + i)
      arr.push(cur.toISOString().slice(0, 10))
    }
    return arr
  }

  // legend filter toggle
  function toggleFilter(hId: string) {
    setFilterMap(prev => ({ ...prev, [hId]: !prev[hId] }))
  }

  // Quick add: open quick add modal prefilling habit/date
  function openQuickAdd(dateISO?: string, habitId?: string) {
    setQuickAddState({ open: true, date: dateISO, habitId })
  }

  // remove an entry (local only)
  function deleteLocalEntry(entryId: string) {
    const list = JSON.parse(localStorage.getItem(LOCAL_ENTRIES_KEY) || '[]') as Entry[]
    const filtered = list.filter(e => e.id !== entryId)
    localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(filtered))
    window.dispatchEvent(new Event('hj:updated'))
    setSelectedDay(null)
  }

  // Render month grid
  function renderMonthGrid() {
    const cells: JSX.Element[] = []
    // padding
    for (let i = 0; i < startDay; i++) {
      cells.push(<div key={`pad-${i}`} />)
    }
    for (let i = 0; i < monthDays; i++) {
      const day = i + 1
      const dKey = dateKeyForDay(day)
      const rawDayEntries = entriesByDate[dKey] ?? []
      const dayEntries = rawDayEntries.filter(en => filterMap[en.habit_id] !== false).slice(0, 4)
      const isToday = dKey === todayISO

      cells.push(
        <div key={`day-${dKey}`} className={`p-3 rounded-lg frost-card min-h-[96px] relative group ${isToday ? 'ring-2 ring-[#14C38E]/20' : ''}`}>
          <div className="flex items-start justify-between">
            <div className="text-sm font-medium">{day}</div>
            {rawDayEntries.length > 0 && <div className="text-xs px-2 py-0.5 rounded bg-white/5">{rawDayEntries.length}</div>}
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

          {/* double click (desktop) or double tap (mobile) to quick add */}
          <div
            onDoubleClick={(e) => { e.stopPropagation(); openQuickAdd(dKey, dayEntries[0]?.habit_id) }}
            onClick={(e) => { /* single click reserved for future */ }}
            className="absolute right-2 bottom-2 text-xs text-muted cursor-pointer select-none"
            title="Double-click to Quick Add entry for this day"
          >
            Quick Add (dbl)
          </div>

          {/* hover tooltip */}
          <div className="absolute left-2 top-8 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition duration-150 z-20">
            {rawDayEntries.length > 0 && (
              <div className="rounded bg-black/80 text-xs p-2 text-white shadow max-w-xs">
                {rawDayEntries.map(d => {
                  const habit = habits.find(h => h.id === d.habit_id)
                  return <div key={d.id}>{(habit?.name ?? 'Habit')} — {d.value}{habit?.unit ? ` ${habit.unit}` : ''}</div>
                })}
              </div>
            )}
          </div>
        </div>
      )
    }
    return <div className="grid grid-cols-7 gap-2">{cells}</div>
  }

  // Render week grid
  function renderWeekGrid() {
    const weekDates = makeWeekDates()
    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map(dKey => {
          const dateObj = new Date(dKey)
          const dayNum = dateObj.getDate()
          const rawDayEntries = entriesByDate[dKey] ?? []
          const dayEntries = rawDayEntries.filter(en => filterMap[en.habit_id] !== false).slice(0, 6)
          const isToday = dKey === todayISO
          return (
            <div key={`w-${dKey}`} className={`p-3 rounded-lg frost-card min-h-[120px] relative group ${isToday ? 'ring-2 ring-[#14C38E]/20' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium">{dateObj.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                  <div className="text-xs text-muted">{dayNum}</div>
                </div>
                {rawDayEntries.length > 0 && <div className="text-xs px-2 py-0.5 rounded bg-white/5">{rawDayEntries.length}</div>}
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
                {dayEntries.length === 0 && <div className="text-sm text-muted">No entries</div>}
              </div>

              <div
                onDoubleClick={() => openQuickAdd(dKey, dayEntries[0]?.habit_id)}
                className="absolute right-2 bottom-2 text-xs text-muted cursor-pointer select-none"
                title="Double-click to Quick Add entry for this day"
              >
                Quick Add (dbl)
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // UI header and legend filters
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">
          {viewMode === 'month' ? new Date(year, month).toLocaleString(undefined, { month: 'long', year: 'numeric' }) : 'Week view'}
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'month' ? (
            <>
              <button onClick={prevMonth} className="px-2 py-1 rounded bg-white/5">Prev</button>
              <button onClick={nextMonth} className="px-2 py-1 rounded bg-white/5">Next</button>
            </>
          ) : (
            <>
              <button onClick={() => {
                const anchor = makeWeekDates()[0]
                const d = new Date(anchor); d.setDate(d.getDate() - 7)
                setYear(d.getFullYear()); setMonth(d.getMonth())
              }} className="px-2 py-1 rounded bg-white/5">Prev</button>
              <button onClick={() => {
                const anchor = makeWeekDates()[0]
                const d = new Date(anchor); d.setDate(d.getDate() + 7)
                setYear(d.getFullYear()); setMonth(d.getMonth())
              }} className="px-2 py-1 rounded bg-white/5">Next</button>
            </>
          )}

          <div className="ml-3 bg-white/5 rounded p-1">
            <button onClick={() => setViewMode('month')} className={`px-2 py-1 rounded ${viewMode === 'month' ? 'bg-white/10' : ''}`}>Month</button>
            <button onClick={() => setViewMode('week')} className={`px-2 py-1 rounded ${viewMode === 'week' ? 'bg-white/10' : ''}`}>Week</button>
          </div>
        </div>
      </div>

      <div className="mb-2 text-sm text-muted">Legend & Filters (toggle to hide/show habit):</div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {habits.length === 0 && <div className="text-sm text-muted">No habits yet</div>}
        {habits.slice(0, 24).map(h => (
          <button
            key={h.id}
            onClick={() => toggleFilter(h.id)}
            className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${filterMap[h.id] ? 'bg-white/5' : 'bg-white/2/10'}`}
            title={filterMap[h.id] ? 'Visible — click to hide' : 'Hidden — click to show'}
          >
            <span style={{ width: 12, height: 12, background: h.color ?? '#14C38E', borderRadius: 6 }} />
            <span className="truncate max-w-[120px]">{h.name}</span>
          </button>
        ))}
      </div>

      <div className="mb-3">
        {loading && <div className="text-sm text-muted">Loading calendar...</div>}
      </div>

      {/* main grid */}
      {viewMode === 'month' ? renderMonthGrid() : renderWeekGrid()}

      {/* day modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div onClick={() => setSelectedDay(null)} className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-w-2xl p-6 rounded-2xl bg-[#07121a] text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">Entries — {selectedDay}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => { openQuickAdd(selectedDay); }} className="px-3 py-1 rounded bg-white/6">Add entry</button>
                <button onClick={() => setSelectedDay(null)} className="px-3 py-1 rounded bg-white/5">Close</button>
              </div>
            </div>

            <div className="space-y-3">
              {(entriesByDate[selectedDay] ?? []).filter(en => filterMap[en.habit_id] !== false).length === 0 && <div className="text-muted">No entries on this day.</div>}
              {(entriesByDate[selectedDay] ?? []).filter(en => filterMap[en.habit_id] !== false).map(e => {
                const habit = habits.find(h => h.id === e.habit_id)
                return (
                  <div key={e.id} className="p-3 rounded bg-white/4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{habit?.name ?? 'Habit'}</div>
                      <div className="text-sm text-muted">{e.value} {habit?.unit ?? ''} • {new Date(e.created_at ?? selectedDay).toLocaleTimeString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => {
                        // edit flow: open QuickAdd prefilled to same habit/date with value prefilled
                        setQuickAddState({ open: true, date: e.entry_date, habitId: e.habit_id })
                      }} className="px-2 py-1 rounded bg-white/6">Edit</button>

                      <button onClick={() => {
                        if (!confirm('Delete this entry locally?')) return
                        deleteLocalEntry(e.id)
                      }} className="px-2 py-1 rounded bg-red-700/40">Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add modal */}
      {quickAddState.open && (
        <QuickAddEntry
          open={quickAddState.open}
          onClose={() => setQuickAddState({ open: false })}
          onAdded={() => { window.dispatchEvent(new Event('hj:updated')); setQuickAddState({ open: false }) }}
          defaultDate={quickAddState.date}
          defaultHabitId={quickAddState.habitId}
          habits={habits}
        />
      )}
    </div>
  )
}
