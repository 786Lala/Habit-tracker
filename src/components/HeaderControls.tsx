// src/components/HeaderControls.tsx
import React from 'react'
import SyncButton from './SyncButton'

export default function HeaderControls() {
  const [dark, setDark] = React.useState<boolean>(() => {
    const s = localStorage.getItem('hj_theme')
    if (s) return s === 'dark'
    // default to system
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  React.useEffect(() => {
    if (dark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    localStorage.setItem('hj_theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className="flex items-center gap-3">
      <SyncButton />
      <button onClick={() => setDark(d => !d)} className="px-3 py-1 rounded bg-white/5">
        {dark ? 'Light' : 'Dark'}
      </button>
    </div>
  )
}
