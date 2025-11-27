// src/components/modals/AddHabitModal.tsx
import React from 'react'
import { supabase } from '../../lib/supabase'

type Props = { open: boolean; onClose: ()=>void; onAdded?: (habitId?: string)=>void }

export default function AddHabitModal({ open, onClose, onAdded }: Props) {
  const [name, setName] = React.useState('')
  const [unit, setUnit] = React.useState('steps')
  const [goal, setGoal] = React.useState<number | ''>('')
  const [color, setColor] = React.useState('#14C38E')
  const localKey = 'hj_local_habits'
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string|null>(null)

  async function create() {
    if (!name.trim()) { setError('Name required'); return }
    setLoading(true); setError(null)
    try {
      // Create a stable local id now
      const localId = `local_${Date.now()}_${Math.floor(Math.random()*9999)}`
      const userRes = await supabase.auth.getUser().catch(()=>null)
      const userId = (userRes as any)?.data?.user?.id ?? null

      const habit = {
        id: localId,
        user_id: userId,
        name: name.trim(),
        unit: unit || 'units',
        daily_goal: goal === '' ? null : Number(goal),
        color,
        created_at: new Date().toISOString(),
        local: userId ? false : true
      }

      // Save locally first (guarantees immediate UI)
      const local = JSON.parse(localStorage.getItem(localKey) || '[]')
      local.unshift(habit)
      localStorage.setItem(localKey, JSON.stringify(local))

      // Notify UI immediately
      window.dispatchEvent(new Event('hj:updated'))
      if (onAdded) onAdded(habit.id)

      // Best-effort: push to Supabase (if signed in) and replace local id with server id
      if (userId) {
        const payload = { user_id: userId, name: habit.name, unit: habit.unit, daily_goal: habit.daily_goal, color: habit.color }
        const res = await supabase.from('habits').insert([payload]).select()
        if (!res?.error && res?.data?.length) {
          const server = res.data[0]
          // replace local id with server id in hj_local_habits and hj_local_entries
          const currentLocal = JSON.parse(localStorage.getItem(localKey) || '[]')
          const replaced = currentLocal.map((h:any) => h.id === localId ? { ...h, id: server.id, local: false } : h)
          localStorage.setItem(localKey, JSON.stringify(replaced))
          // Replace references in entries too
          const entriesKey = 'hj_local_entries'
          const entries = JSON.parse(localStorage.getItem(entriesKey) || '[]')
          const updatedEntries = entries.map((e:any) => e.habit_id === localId ? { ...e, habit_id: server.id } : e)
          localStorage.setItem(entriesKey, JSON.stringify(updatedEntries))
          window.dispatchEvent(new Event('hj:updated'))
        }
      }

      // reset form
      setName(''); setUnit('steps'); setGoal(''); setColor('#14C38E')
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err?.message ?? 'Unable to save')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative bg-[#0f1724] p-6 rounded-2xl w-full max-w-md text-white">
        <h3 className="text-xl mb-4">Add Habit</h3>
        {error && <div className="text-sm text-red-400 mb-3">{error}</div>}
        <label className="block"><div className="text-sm text-gray-300">Name</div><input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full bg-white/5 p-2 rounded" /></label>
        <label className="block mt-2"><div className="text-sm text-gray-300">Unit</div><input value={unit} onChange={e=>setUnit(e.target.value)} className="mt-1 w-full bg-white/5 p-2 rounded" /></label>
        <label className="block mt-2"><div className="text-sm text-gray-300">Daily goal</div><input type="number" value={goal} onChange={e=>setGoal(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-white/5 p-2 rounded" /></label>
        <label className="block mt-2"><div className="text-sm text-gray-300">Color</div><input type="color" value={color} onChange={e=>setColor(e.target.value)} className="mt-1 w-20 h-10 p-1 rounded" /></label>

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-white/5">Cancel</button>
          <button onClick={create} disabled={loading} className="px-4 py-2 rounded bg-gradient-to-r from-[#7EE7C6] to-[#14C38E] text-black">{loading ? 'Saving...' : 'Add'}</button>
        </div>
      </div>
    </div>
  )
}
