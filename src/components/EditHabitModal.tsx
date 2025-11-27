// src/components/EditHabitModal.tsx
import React from 'react'
import { supabase } from '../lib/supabase'

type Habit = { id?: string; name: string; unit?: string; daily_goal?: number | null; color?: string; local?: boolean }
type Props = { open: boolean; onClose: ()=>void; habit: Habit | null; onSaved?: ()=>void }

export default function EditHabitModal({ open, onClose, habit, onSaved }: Props): JSX.Element | null {
  const [name, setName] = React.useState(habit?.name ?? '')
  const [unit, setUnit] = React.useState(habit?.unit ?? 'steps')
  const [dailyGoal, setDailyGoal] = React.useState<number | ''>(habit?.daily_goal ?? '')
  const [color, setColor] = React.useState(habit?.color ?? '#14C38E')
  const [todayValue, setTodayValue] = React.useState<number | ''>('')
  const [loading, setLoading] = React.useState(false)
  const localHabitsKey = 'hj_local_habits'
  const localEntriesKey = 'hj_local_entries'

  React.useEffect(() => {
    setName(habit?.name ?? '')
    setUnit(habit?.unit ?? 'steps')
    setDailyGoal(habit?.daily_goal ?? '')
    setColor(habit?.color ?? '#14C38E')
    setTodayValue('')
  }, [habit, open])

  if (!open) return null

  async function save() {
    setLoading(true)
    try {
      const userRes = await supabase.auth.getUser()
      const userId = userRes?.data?.user?.id ?? null

      // update local habits list
      const local = JSON.parse(localStorage.getItem(localHabitsKey) ?? '[]') as any[]
      const id = habit?.id ?? `local_${Date.now()}_${Math.floor(Math.random()*9999)}`
      const exists = local.findIndex(h => h.id === habit?.id)
      const updated = { id, user_id: userId, name: name.trim(), unit, daily_goal: dailyGoal === '' ? null : Number(dailyGoal), color, created_at: new Date().toISOString(), local: userId ? false : true }
      if (exists >= 0) local[exists] = updated
      else local.unshift(updated)
      localStorage.setItem(localHabitsKey, JSON.stringify(local))

      // sync to server if signed in (best-effort)
      if (userId) {
        try {
          if (habit?.id && !String(habit.id).startsWith('local_')) {
            await supabase.from('habits').update({ name: updated.name, unit: updated.unit, daily_goal: updated.daily_goal, color: updated.color }).eq('id', habit.id)
          } else {
            await supabase.from('habits').insert([{ user_id: userId, name: updated.name, unit: updated.unit, daily_goal: updated.daily_goal, color: updated.color }])
          }
        } catch (e) {
          console.warn('Supabase save failed; local copy kept', e)
        }
      }

      // optionally create today's entry if value provided
      if (todayValue !== '' && todayValue !== null) {
        const today = new Date().toISOString().slice(0,10)
        const localEntries = JSON.parse(localStorage.getItem(localEntriesKey) ?? '[]') as any[]
        // check if existing entry today for this habit -> update it
        const found = localEntries.findIndex((en: any) => en.habit_id === id && en.entry_date === today)
        if (found >= 0) {
          localEntries[found].value = Number(todayValue)
          localEntries[found].created_at = new Date().toISOString()
        } else {
          localEntries.unshift({ id: `local_e_${Date.now()}_${Math.floor(Math.random()*9999)}`, habit_id: id, value: Number(todayValue), entry_date: today, created_at: new Date().toISOString(), local: true })
        }
        localStorage.setItem(localEntriesKey, JSON.stringify(localEntries))

        // attempt server insert
        try {
          const userId2 = userId
          if (userId2) {
            const payload = { habit_id: id, value: Number(todayValue), entry_date: today }
            await supabase.from('entries').insert([payload])
          }
        } catch (e) {
          console.warn('Supabase entry insert failed; local kept', e)
        }
      }

      window.dispatchEvent(new Event('hj:updated'))
      if (onSaved) onSaved()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative bg-[#0f1724] p-6 rounded-2xl w-full max-w-md text-white">
        <h3 className="text-xl mb-4">{habit ? 'Edit Habit' : 'Create Habit'}</h3>

        <div className="space-y-3">
          <label className="block">
            <div className="text-sm text-gray-300">Name</div>
            <input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full bg-white/5 p-2 rounded" />
          </label>

          <label>
            <div className="text-sm text-gray-300">Unit</div>
            <input value={unit} onChange={e=>setUnit(e.target.value)} className="mt-1 w-full bg-white/5 p-2 rounded" />
          </label>

          <label>
            <div className="text-sm text-gray-300">Daily goal</div>
            <input type="number" value={dailyGoal} onChange={e=>setDailyGoal(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-white/5 p-2 rounded" />
          </label>

          <label>
            <div className="text-sm text-gray-300">Color</div>
            <input type="color" value={color} onChange={e=>setColor(e.target.value)} className="mt-1 w-20 h-10 p-1 rounded" />
          </label>

          <label>
            <div className="text-sm text-gray-300">Set today's progress</div>
            <input type="number" value={todayValue} onChange={e=>setTodayValue(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-white/5 p-2 rounded" placeholder="e.g. 4000" />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-white/5">Cancel</button>
          <button onClick={save} disabled={loading} className="px-4 py-2 rounded bg-gradient-to-r from-[#7EE7C6] to-[#14C38E] text-black font-semibold">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
