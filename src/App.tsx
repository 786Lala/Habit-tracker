// src/App.tsx
import React from 'react'
import Header from './components/Header'
import BookmarkSidebar from './components/BookmarkSidebar'
import Dashboard from './components/Dashboard'
import ToastContainer from './components/ToastContainer'
import HabitsPage from './components/HabitsPage'
import AdvancedPage from './components/AdvancedPage'

export default function App(): JSX.Element {
  const [refreshKey, setRefreshKey] = React.useState<number>(0)
  const [view, setView] = React.useState<'dashboard'|'habits'|'advanced'>('dashboard')

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <BookmarkSidebar setRefreshKey={(fn:any) => setRefreshKey(fn)} />

      {/* simple top nav */}
      <div className="bg-transparent/0 border-b border-white/3">
        <div className="container flex items-center gap-4 py-3">
          <button onClick={() => setView('dashboard')} className={`px-3 py-2 rounded ${view==='dashboard' ? 'bg-gradient-to-r from-[#7EE7C6] to-[#14C38E] text-black font-semibold' : 'text-white/80'}`}>Dashboard</button>
          <button onClick={() => setView('habits')} className={`px-3 py-2 rounded ${view==='habits' ? 'bg-white/6 text-white' : 'text-white/80'}`}>Habits</button>
          <button onClick={() => setView('advanced')} className={`px-3 py-2 rounded ${view==='advanced' ? 'bg-white/6 text-white' : 'text-white/80'}`}>Advanced</button>
        </div>
      </div>

      <main className="flex-1 container pt-8 pb-12">
        {view === 'dashboard' && <Dashboard refreshKey={refreshKey} />}
        {view === 'habits' && <HabitsPage onRefresh={() => setRefreshKey(n => n+1)} />}
        {view === 'advanced' && <AdvancedPage />}
      </main>

      <ToastContainer />
    </div>
  )
}
