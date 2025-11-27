// src/components/CreateSectionModal.tsx
import React from 'react'
import { supabase } from '../lib/supabase'

type Props = { open: boolean; onClose: ()=>void; onCreated?: ()=>void }

export default function CreateSectionModal({ open, onClose, onCreated }: Props): JSX.Element | null {
  const [name, setName] = React.useState('')
  const [color, setColor] = React.useState('#FFD75A')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const localKey = 'hj_local_sections'

  async function createSection() {
    if (!name.trim()) {
      setError('Please enter a section name.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const userRes = await supabase.auth.getUser()
      const userId = userRes?.data?.user?.id ?? null

      const payload = { user_id: userId, name: name.trim(), color }
      if (!userId) {
        // save locally
        const local = JSON.parse(localStorage.getItem(localKey) ?? '[]')
        const id = `local_section_${Date.now()}`
        local.unshift({ id, user_id: null, name: payload.name, color, created_at: new Date().toISOString(), local: true })
        localStorage.setItem(localKey, JSON.stringify(local))
        setName('')
        setColor('#FFD75A')
        if (onCreated) onCreated()
        return
      }

      const res = await supabase.from('sections').insert([payload]).select()
      if (res?.error) {
        setError(res.error.message ?? 'Failed to create section; saved locally.')
        // fallback: local store
        const local = JSON.parse(localStorage.getItem(localKey) ?? '[]')
        const id = `local_section_${Date.now()}`
        local.unshift({ id, user_id: null, name: payload.name, color, created_at: new Date().toISOString(), local: true })
        localStorage.setItem(localKey, JSON.stringify(local))
      } else {
        setName('')
        setColor('#FFD75A')
        if (onCreated) onCreated()
      }
    } catch (err: any) {
      setError(err?.message ?? 'Unknown error (saved locally).')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative bg-[#0f1724] p-6 rounded-2xl w-full max-w-md text-white">
        <h3 className="text-xl mb-4">Create Section</h3>
        {error && <div className="text-sm text-red-400 mb-3">{error}</div>}
        <div className="space-y-3">
          <label className="block">
            <div className="text-sm text-gray-300">Section name</div>
            <input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full bg-white/5 p-2 rounded" />
          </label>
          <label className="block">
            <div className="text-sm text-gray-300">Color</div>
            <input type="color" value={color} onChange={e=>setColor(e.target.value)} className="mt-1 w-20 h-10 p-1 rounded" />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-white/5">Cancel</button>
          <button onClick={createSection} disabled={loading} className="px-4 py-2 rounded bg-primary">
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
