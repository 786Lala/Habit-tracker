// src/components/HabitsPage.tsx
import React from 'react'
import { downloadCSV } from '../utils/csv'

type Habit = {
  id?: string
  name: string
  unit?: string
  daily_goal?: number | null
  color?: string
  local?: boolean
  created_at?: string
}

function useLocalHabits() {
  const key = 'hj_local_habits'
  const read = (): Habit[] => JSON.parse(localStorage.getItem(key) || '[]')
  const write = (v: Habit[]) => localStorage.setItem(key, JSON.stringify(v))
  return { key, read, write }
}

export default function HabitsPage() {
  const { key, read, write } = useLocalHabits()
  const [habits, setHabits] = React.useState<Habit[]>([])
  const [editing, setEditing] = React.useState<Habit | null>(null)
  const [openCreate, setOpenCreate] = React.useState(false)

  React.useEffect(() => {
    setHabits(read())
    function onUpdated() {
      setHabits(read())
    }
    window.addEventListener('hj:updated', onUpdated)
    window.addEventListener('storage', (e) => {
      if (e.key === key) setHabits(read())
    })
    return () => {
      window.removeEventListener('hj:updated', onUpdated)
    }
  }, [])

  function saveLocal(h: Habit) {
    const all = read()
    const idx = all.findIndex(x => x.id === h.id)
    if (idx >= 0) all[idx] = h
    else all.unshift(h)
    write(all)
    window.dispatchEvent(new Event('hj:updated'))
    setHabits(all)
  }

  function removeLocal(id?: string) {
    if (!id) return
    const all = read().filter(h => h.id !== id)
    write(all)
    window.dispatchEvent(new Event('hj:updated'))
    setHabits(all)
  }

  function exportHabitsCSV() {
    const data = read()
    downloadCSV(data, 'habits.csv')
  }

  function exportEntriesCSV() {
    const entries = JSON.parse(localStorage.getItem('hj_local_entries') || '[]')
    downloadCSV(entries, 'entries.csv')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Habits</h2>
        <div className="flex gap-2">
          <button onClick={() => setOpenCreate(true)} className="px-3 py-2 rounded bg-gradient-to-r from-[#7EE7C6] to-[#14C38E] text-black">New Habit</button>
          <button onClick={exportHabitsCSV} className="px-3 py-2 rounded bg-white/5">Export Habits CSV</button>
          <button onClick={exportEntriesCSV} className="px-3 py-2 rounded bg-white/5">Export Entries CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {habits.length === 0 && <div className="card frost-card p-6 text-gray-300">No habits yet — create one.</div>}
        {habits.map(h => (
          <div key={h.id ?? Math.random()} className="card frost-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{h.name}</div>
                <div className="text-sm text-muted">{h.unit ?? 'units'} • {h.daily_goal ?? 'no goal'}</div>
                {h.local && <div className="text-xs mt-2 inline-block px-2 py-1 rounded bg-yellow-900/30 text-yellow-200">Local</div>}
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => setEditing(h)} className="text-xs px-2 py-1 rounded bg-white/6">Edit / Update</button>
                <button onClick={() => removeLocal(h.id)} className="text-xs px-2 py-1 rounded bg-red-700/40">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {openCreate && <EditHabitModal onClose={() => setOpenCreate(false)} onSaved={(h) => { saveLocal(h); setOpenCreate(false) }} />}
      {editing && <EditHabitModal habit={editing} onClose={() => setEditing(null)} onSaved={(h) => { saveLocal(h); setEditing(null) }} />}
    </div>
  )
}

/* EditHabitModal inline component */
function EditHabitModal({ onClose, habit, onSaved }: { onClose: () => void; habit?: Habit | null; onSaved?: (h: Habit) => void }) {
  const isEdit = !!habit
  const [name, setName] = React.useState(habit?.name ?? '')
  const [unit, setUnit] = React.useState(habit?.unit ?? 'steps')
  const [goal, setGoal] = React.useState<number | ''>(habit?.daily_goal ?? '')
  const [color, setColor] = React.useState(habit?.color ?? '#14C38E')
  const [todayValue, setTodayValue] = React.useState<number | ''>('')
  const localHKey = 'hj_local_habits'
  const localEKey = 'hj_local_entries'

  React.useEffect(() => {
    setName(habit?.name ?? '')
    setUnit(habit?.unit ?? 'steps')
    setGoal(habit?.daily_goal ?? '')
    setColor(habit?.color ?? '#14C38E')
    setTodayValue('')
  }, [habit])

  function save() {
    if (!name.trim()) { alert('Name required'); return }
    const id = habit?.id ?? `local_${Date.now()}_${Math.floor(Math.random() * 9999)}`
    const newH: Habit = { id, name: name.trim(), unit, daily_goal: goal === '' ? null : Number(goal), color, local: true, created_at: new Date().toISOString() }
    const all = JSON.parse(localStorage.getItem(localHKey) || '[]') as Habit[]
    const idx = all.findIndex(x => x.id === id)
    if (idx >= 0) all[idx] = newH
    else all.unshift(newH)
    localStorage.setItem(localHKey, JSON.stringify(all))

    // optionally set today's progress
    if (todayValue !== '' && todayValue !== null) {
      const today = new Date().toISOString().slice(0, 10)
      const entries = JSON.parse(localStorage.getItem(localEKey) || '[]')
      const existingIndex = entries.findIndex((en: any) => en.habit_id === id && en.entry_date === today)
      if (existingIndex >= 0) {
        entries[existingIndex].value = Number(todayValue)
        entries[existingIndex].created_at = new Date().toISOString()
      } else {
        entries.unshift({ id: `local_e_${Date.now()}_${Math.floor(Math.random() * 9999)}`, habit_id: id, value: Number(todayValue), entry_date: today, created_at: new Date().toISOString(), local: true })
      }
      localStorage.setItem(localEKey, JSON.stringify(entries))
    }

    window.dispatchEvent(new Event('hj:updated'))
    onSaved && onSaved(newH)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative bg-[#0f1724] p-6 rounded-2xl w-full max-w-md text-white">
        <h3 className="text-xl mb-4">{isEdit ? 'Edit Habit' : 'Create Habit'}</h3>
        <label className="block">
          <div className="text-sm text-gray-300">Name</div>
          <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full bg-white/5 p-2 rounded" />
        </label>
        <label className="block mt-2">
          <div className="text-sm text-gray-300">Unit</div>
          <input value={unit} onChange={e => setUnit(e.target.value)} className="mt-1 w-full bg-white/5 p-2 rounded" />
        </label>
        <label className="block mt-2">
          <div className="text-sm text-gray-300">Daily goal</div>
          <input type="number" value={goal} onChange={e => setGoal(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-white/5 p-2 rounded" />
        </label>
        <label className="block mt-2">
          <div className="text-sm text-gray-300">Color</div>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="mt-1 w-20 h-10 p-1 rounded" />
        </label>
        <label className="block mt-2">
          <div className="text-sm text-gray-300">Set today's progress</div>
          <input type="number" value={todayValue} onChange={e => setTodayValue(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-white/5 p-2 rounded" placeholder="e.g. 4000" />
        </label>

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-white/5">Cancel</button>
          <button onClick={save} className="px-4 py-2 rounded bg-gradient-to-r from-[#7EE7C6] to-[#14C38E] text-black">Save</button>
        </div>
      </div>
    </div>
  )
}
