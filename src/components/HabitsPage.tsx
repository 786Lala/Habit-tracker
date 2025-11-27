// src/components/HabitsPage.tsx
import React from 'react'
import { useForm } from 'react-hook-form'
import { downloadCSV } from '../utils/csv'

type Habit = {
  id: string
  name: string
  unit?: string
  daily_goal?: number | null
  color?: string
  local?: boolean
  created_at?: string
  updated_at?: string
}

const LOCAL_HABITS_KEY = 'hj_local_habits'
const LOCAL_ENTRIES_KEY = 'hj_local_entries'

export default function HabitsPage(): JSX.Element {
  const [habits, setHabits] = React.useState<Habit[]>([])
  const [editing, setEditing] = React.useState<Habit | null>(null)
  const [openCreate, setOpenCreate] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const PER_PAGE = 10

  // load local habits
  function readLocal(): Habit[] {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_HABITS_KEY) || '[]')
    } catch {
      return []
    }
  }

  function writeLocal(list: Habit[]) {
    localStorage.setItem(LOCAL_HABITS_KEY, JSON.stringify(list))
    window.dispatchEvent(new Event('hj:updated'))
    setHabits(list)
  }

  React.useEffect(() => {
    setHabits(readLocal())
    function onUpdated() { setHabits(readLocal()) }
    window.addEventListener('hj:updated', onUpdated)
    window.addEventListener('storage', (e) => {
      if (e.key === LOCAL_HABITS_KEY) setHabits(readLocal())
    })
    return () => {
      window.removeEventListener('hj:updated', onUpdated)
    }
  }, [])

  function removeLocal(id?: string) {
    if (!id) return
    const filtered = readLocal().filter(h => h.id !== id)
    writeLocal(filtered)
  }

  function exportHabitsCSV() {
    const data = readLocal()
    downloadCSV(data, 'habits.csv')
  }

  function exportEntriesCSV() {
    const entries = JSON.parse(localStorage.getItem(LOCAL_ENTRIES_KEY) || '[]')
    downloadCSV(entries, 'entries.csv')
  }

  // paged data
  const paged = habits.slice(0, page * PER_PAGE)

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
        {paged.length === 0 && (
          <div className="card frost-card p-6 text-gray-300">No habits yet — create one.</div>
        )}

        {paged.map(h => (
          <div key={h.id} className="card frost-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{h.name}</div>
                <div className="text-sm text-muted">{h.unit ?? 'units'} • {h.daily_goal ?? 'no goal'}</div>
                {h.local && <div className="text-xs mt-2 inline-block px-2 py-1 rounded bg-yellow-900/30 text-yellow-200">Local</div>}
              </div>

              <div className="flex flex-col gap-2">
                <button onClick={() => setEditing(h)} className="text-xs px-2 py-1 rounded bg-white/6">Edit / Update</button>
                <button onClick={() => { if (confirm('Delete habit?')) removeLocal(h.id) }} className="text-xs px-2 py-1 rounded bg-red-700/40">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {habits.length > page * PER_PAGE && (
        <div className="flex justify-center mt-4">
          <button onClick={() => setPage(p => p + 1)} className="px-4 py-2 rounded bg-white/5">Load more</button>
        </div>
      )}

      {openCreate && (
        <EditHabitModal
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onSaved={(h) => { const cur = readLocal(); cur.unshift(h); writeLocal(cur); setOpenCreate(false) }}
        />
      )}

      {editing && (
        <EditHabitModal
          open={!!editing}
          habit={editing}
          onClose={() => setEditing(null)}
          onSaved={(h) => {
            const cur = readLocal()
            const idx = cur.findIndex(x => x.id === h.id)
            if (idx >= 0) cur[idx] = h
            else cur.unshift(h)
            writeLocal(cur)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

/* ---------------------------
   EditHabitModal component
   --------------------------- */
function EditHabitModal({ open, onClose, habit, onSaved }: { open: boolean; onClose: ()=>void; habit?: Habit | null; onSaved?: (h: Habit)=>void }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<any>({
    defaultValues: { name: habit?.name ?? '', unit: habit?.unit ?? 'steps', daily_goal: habit?.daily_goal ?? '', color: habit?.color ?? '#14C38E', todayValue: '' }
  })

  React.useEffect(() => {
    reset({ name: habit?.name ?? '', unit: habit?.unit ?? 'steps', daily_goal: habit?.daily_goal ?? '', color: habit?.color ?? '#14C38E', todayValue: '' })
  }, [habit, open, reset])

  if (!open) return null

  function toast(msg: string) {
    const el = document.createElement('div')
    el.textContent = msg
    el.style.cssText = 'position:fixed;right:20px;bottom:20px;padding:10px 14px;border-radius:8px;background:#111;color:white;z-index:99999'
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 2200)
  }

  function onSubmit(data: any) {
    if (!data.name || data.name.trim().length === 0) {
      toast('Habit name required!')
      return
    }
    const id = habit?.id ?? `local_${Date.now()}_${Math.floor(Math.random()*9999)}`
    const newH: Habit = {
      id,
      name: data.name.trim(),
      unit: data.unit,
      daily_goal: data.daily_goal === '' ? null : Number(data.daily_goal),
      color: data.color,
      local: true,
      created_at: habit?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // save today's entry if provided
    if (data.todayValue !== '' && data.todayValue !== null) {
      const entries = JSON.parse(localStorage.getItem(LOCAL_ENTRIES_KEY) || '[]')
      const today = new Date().toISOString().slice(0,10)
      const existingIndex = entries.findIndex((en: any) => en.habit_id === id && en.entry_date === today)
      if (existingIndex >= 0) {
        entries[existingIndex].value = Number(data.todayValue)
        entries[existingIndex].created_at = new Date().toISOString()
      } else {
        entries.unshift({ id: `local_e_${Date.now()}_${Math.floor(Math.random()*9999)}`, habit_id: id, value: Number(data.todayValue), entry_date: today, created_at: new Date().toISOString(), local: true })
      }
      localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(entries))
    }

    onSaved && onSaved(newH)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/50" />
      <form onSubmit={handleSubmit(onSubmit)} className="relative bg-[#0f1724] p-6 rounded-2xl w-full max-w-md text-white">
        <h3 className="text-xl mb-4">{habit ? 'Edit Habit' : 'Create Habit'}</h3>

        <label className="block">
          <div className="text-sm text-gray-300">Name</div>
          <input {...register('name', { required: true, minLength: 1 })} className={`mt-1 w-full p-2 rounded ${errors.name ? 'border-2 border-red-500' : 'bg-white/5'}`} />
        </label>

        <label className="block mt-2">
          <div className="text-sm text-gray-300">Unit</div>
          <input {...register('unit')} className="mt-1 w-full bg-white/5 p-2 rounded" />
        </label>

        <label className="block mt-2">
          <div className="text-sm text-gray-300">Daily goal</div>
          <input type="number" {...register('daily_goal', { valueAsNumber: true })} className="mt-1 w-full bg-white/5 p-2 rounded" />
        </label>

        <label className="block mt-2">
          <div className="text-sm text-gray-300">Color</div>
          <input type="color" {...register('color')} className="mt-1 w-20 h-10 p-1 rounded" />
        </label>

        <label className="block mt-2">
          <div className="text-sm text-gray-300">Set today's progress</div>
          <input type="number" {...register('todayValue', { valueAsNumber: true })} className="mt-1 w-full bg-white/5 p-2 rounded" placeholder="e.g. 4000" />
        </label>

        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-white/5">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded bg-gradient-to-r from-[#7EE7C6] to-[#14C38E] text-black">Save</button>
        </div>
      </form>
    </div>
  )
}
