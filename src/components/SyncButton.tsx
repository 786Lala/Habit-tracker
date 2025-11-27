// src/components/SyncButton.tsx
import React from 'react'
import { syncLocalToSupabase } from '../utils/sync'

export default function SyncButton() {
  const [running, setRunning] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [pct, setPct] = React.useState(0)
  const abortRef = React.useRef<AbortController | null>(null)

  async function start() {
    if (running) return
    setRunning(true)
    setMessage('Starting...')
    setPct(0)
    const ac = new AbortController()
    abortRef.current = ac
    const onProgress = (m:string, p?:number) => {
      setMessage(m)
      if (typeof p === 'number') setPct(p)
    }
    try {
      const res = await syncLocalToSupabase({ onProgress, abortSignal: ac.signal })
      if (res.success) {
        setMessage('Sync completed')
        setPct(100)
        window.dispatchEvent(new Event('hj:updated'))
      } else {
        setMessage('Sync failed: ' + (res.error ?? 'unknown'))
      }
    } catch (e:any) {
      setMessage('Sync error: ' + (e?.message ?? String(e)))
    } finally {
      setTimeout(()=>{ setRunning(false); setPct(0); setTimeout(()=>setMessage(null), 1200) }, 900)
      abortRef.current = null
    }
  }

  function cancel() {
    if (abortRef.current) {
      abortRef.current.abort()
      setMessage('Cancelling...')
      setRunning(false)
    }
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <button onClick={start} disabled={running} className="px-3 py-1 rounded bg-white/6">
        {running ? 'Syncing...' : 'Sync'}
      </button>
      {running && <button onClick={cancel} className="px-2 py-1 rounded bg-red-700/30">Cancel</button>}
      {message && <div className="text-xs text-muted ml-2">{message}</div>}
      {running && <div className="w-24 h-1 bg-white/6 rounded overflow-hidden ml-2"><div style={{ width: `${pct}%` }} className="h-1 bg-gradient-to-r from-[#7EE7C6] to-[#14C38E]" /></div>}
    </div>
  )
}
