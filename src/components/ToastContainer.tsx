// src/components/ToastContainer.tsx
import React from 'react'

type Toast = { id: string; message: string; level?: 'success'|'error'|'warning'|'info' }

export default function ToastContainer(): JSX.Element {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  React.useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent)?.detail ?? { message: String((e as any).detail ?? 'Done') }
      const t: Toast = { id: String(Date.now()) + Math.random().toString(16).slice(2), message: detail.message || detail, level: detail.level || 'info' }
      setToasts(prev => [t, ...prev])
      // auto remove after 3.5s
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id))
      }, 3500)
    }
    window.addEventListener('hj:toast', handler as EventListener)
    return () => window.removeEventListener('hj:toast', handler as EventListener)
  }, [])

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map(t => (
        <div key={t.id} className={`rounded-md p-3 text-sm shadow-lg ${t.level === 'success' ? 'bg-green-100 text-black' : t.level === 'error' ? 'bg-red-100 text-black' : t.level === 'warning' ? 'bg-yellow-100 text-black' : 'bg-white/90 text-black'}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
