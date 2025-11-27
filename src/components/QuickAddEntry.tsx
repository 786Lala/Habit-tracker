// src/components/QuickAddEntry.tsx
import React from 'react'
import { supabase } from '../lib/supabase'

type Habit = { id: string; name: string; unit?: string; daily_goal?: number | null; local?: boolean }
type Props = { open: boolean; onClose: ()=>void; onAdded?: ()=>void; habits: Habit[] }

export default function QuickAddEntry({ open, onClose, onAdded, habits }: Props): JSX.Element | null {
  const [habitId, setHabitId] = React.useState<string>('')
  const [value, setValue] = React.useState<number | ''>('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const localEntriesKey = 'hj_local_entries'

  React.useEffect(() => {
    if (open) {
      setError(null)
      setValue('')
      setHabitId(habits.length > 0 ? habits[0].id : '')
    }
  }, [open, habits])

  async function createEntry() {
    setError(null)
    if (!habitId) { setError('Pick a habit'); return }
    if (value === '' || value === null) { setError('Enter a value'); return }

    setLoading(true)
    try {
      const today = new Date().toISOString().slice(0,10)
      const id = `local_e_${Date.now()}_${Math.floor(Math.random()*9999)}`
      const newEntry = {
        id,
        habit_id: habitId,
        value: Number(value),
        entry_date: today,
        created_at: new Date().toISOString(),
        local: true
      }

      // Save locally first
      const local = JSON.parse(localStorage.getItem(localEntriesKey) ?? '[]')
      local.unshift(newEntry)
      localStorage.setItem(localEntriesKey, JSON.stringify(local))

      // Try to save to Supabase if signed in
      try {
        const userRes = await supabase.auth.getUser()
        const userId = userRes?.data?.user?.id ?? null
        if (userId) {
          const payload = { habit_id: habitId, value: Number(value), entry_date: today }
          const res = await supabase.from('entries').insert([payload]).select()
          if (res?.error) {
            console.warn('Supabase entry failed, kept local', res.error.message)
            window.dispatchEvent(new CustomEvent('hj:toast', { detail: { message: 'Saved locally (server error)', level: 'warning' } }))
          } else {
            window.dispatchEvent(new CustomEvent('hj:toast', { detail: { message: 'Entry saved', level: 'success' } }))
          }
        } else {
          // not signed in
          window.dispatchEvent(new CustomEvent('hj:toast', { detail: { message: 'Entry saved locally', level: 'success' } }))
        }
      } catch (e) {
        console.warn('Supabase save exception', e)
        window.dispatchEvent(new CustomEvent('hj:toast', { detail: { message: 'Saved locally', level: 'warning' } }))
      }

      if (onAdded) onAdded()
      window.dispatchEvent(new Event('hj:updated'))
      // reset / close
      setValue('')
      setHabitId(habits.length > 0 ? habits[0].id : '')
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Unknown error')
      window.dispatchEvent(new CustomEvent('hj:toast', { detail: { message: 'Error adding entry', level: 'error' } }))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative bg-[#0f1724] p-6 rounded-2xl w-full max-w-md text-white">
        <h3 className="text-xl mb-4">Quick Add Entry</h3>
        {error && <div className="text-sm text-red-400 mb-3">{error}</div>}
        <div className="space-y-3">
          <label className="block">
            <div className="text-sm text-gray-300">Habit</div>
            <select value={habitId} onChange={e => setHabitId(e.target.value)} className="mt-1 w-full bg-white/5 p-2 rounded">
              <option value="">Select a habit</option>
              {habits.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>

          <label className="block">
            <div className="text-sm text-gray-300">Value</div>
            <input type="number" value={value} onChange={e => setValue(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-white/5 p-2 rounded" />
            <div className="text-xs text-muted mt-1">Enter the recorded value for today.</div>
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-white/5">Cancel</button>
          <button onClick={createEntry} disabled={loading} className="px-4 py-2 rounded bg-gradient-to-r from-[#7EE7C6] to-[#14C38E] text-black font-semibold">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
