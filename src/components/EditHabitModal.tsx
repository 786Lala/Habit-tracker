// src/components/EditHabitModal.tsx
import React from 'react'
import { useForm } from 'react-hook-form'

type HabitForm = { name: string; unit?: string; daily_goal?: number | ''; color?: string; todayValue?: number | '' }
export default function EditHabitModal({ open, onClose, habit, onSaved }: { open: boolean; onClose: ()=>void; habit?: any; onSaved?: (h:any)=>void }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<HabitForm>({ defaultValues: { name: habit?.name ?? '', unit: habit?.unit ?? 'steps', daily_goal: habit?.daily_goal ?? '', color: habit?.color ?? '#14C38E', todayValue: '' } })

  React.useEffect(()=> { reset({ name: habit?.name ?? '', unit: habit?.unit ?? 'steps', daily_goal: habit?.daily_goal ?? '', color: habit?.color ?? '#14C38E', todayValue: '' }) }, [habit, open, reset])

  if (!open) return null
  function toast(msg: string) {
    // minimal toast
    const el = document.createElement('div'); el.textContent = msg
    el.style.cssText = 'position:fixed;right:20px;bottom:20px;padding:10px 14px;border-radius:8px;background:#111;color:white;z-index:99999'
    document.body.appendChild(el); setTimeout(()=>el.remove(), 2200)
  }

  const onSubmit = (data: HabitForm) => {
    if (!data.name || data.name.trim().length === 0) { toast('Habit name required!'); return }
    const id = habit?.id ?? `local_${Date.now()}_${Math.floor(Math.random()*9999)}`
    const newH = { id, name: data.name.trim(), unit: data.unit, daily_goal: data.daily_goal === '' ? null : Number(data.daily_goal), color: data.color, local: true, created_at: new Date().toISOString() }
    const cur = JSON.parse(localStorage.getItem('hj_local_habits') || '[]'); const idx = cur.findIndex((x:any)=>x.id===id); if (idx>=0) cur[idx] = newH; else cur.unshift(newH); localStorage.setItem('hj_local_habits', JSON.stringify(cur))
    if (data.todayValue !== '' && data.todayValue !== null) {
      const entries = JSON.parse(localStorage.getItem('hj_local_entries') || '[]')
      const today = new Date().toISOString().slice(0,10)
      const exist = entries.findIndex((e:any)=>e.habit_id===id && e.entry_date===today)
      if (exist >= 0) { entries[exist].value = Number(data.todayValue); entries[exist].created_at = new Date().toISOString() } else { entries.unshift({ id: `local_e_${Date.now()}_${Math.floor(Math.random()*9999)}`, habit_id: id, value: Number(data.todayValue), entry_date: today, created_at: new Date().toISOString(), local: true }) }
      localStorage.setItem('hj_local_entries', JSON.stringify(entries))
    }
    window.dispatchEvent(new Event('hj:updated'))
    onSaved?.(newH)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/50"/>
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
