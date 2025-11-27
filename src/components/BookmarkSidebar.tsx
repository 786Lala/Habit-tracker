// src/components/BookmarkSidebar.tsx
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AddHabitModal from './modals/AddHabitModal'
import CreateSectionModal from './CreateSectionModal'
import { exportEntriesAsXlsx } from '../utils/export'

type Props = {
  setRefreshKey?: (fn: (n: number) => number) => void
}

export default function BookmarkSidebar({ setRefreshKey }: Props): JSX.Element {
  const [open, setOpen] = React.useState(false)
  const [addOpen, setAddOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)

  const sampleEntries = [
    { date: '2025-11-01', habit: 'Walk', value: 8000, unit: 'steps' },
    { date: '2025-11-02', habit: 'Walk', value: 10200, unit: 'steps' }
  ]

  function handleAdded() {
    if (setRefreshKey) setRefreshKey((n) => n + 1)
  }

  function handleCreated() {
    if (setRefreshKey) setRefreshKey((n) => n + 1)
  }

  return (
    <>
      <div className="fixed top-6 left-0 z-40">
        <motion.button
          aria-label="open menu"
          initial={false}
          animate={open ? { x: 48 } : { x: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={() => setOpen(true)}
          className="w-14 h-16 bg-gradient-to-b from-[#7EE7C6] to-[#14C38E] rounded-tr-md rounded-br-md shadow-lg flex items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M6 2h12v20l-6-4-6 4V2z" fill="#081018"/>
          </svg>
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-30 backdrop-blur-sm bg-black/40"
            />

            <motion.aside
              initial={{ x: -360 }}
              animate={{ x: 0 }}
              exit={{ x: -360 }}
              transition={{ type: 'tween' }}
              className="fixed left-0 top-0 bottom-0 z-40 w-[360px] bg-[#07121a] text-white p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm uppercase tracking-wide">Menu</div>
                <button onClick={() => setOpen(false)} aria-label="close">✕</button>
              </div>

              <nav className="flex flex-col gap-3">
                <button className="text-left p-3 rounded bg-white/5">Dashboard</button>
                <button onClick={() => setAddOpen(true)} className="text-left p-3 rounded">Add Habit</button>
                <button onClick={() => setCreateOpen(true)} className="text-left p-3 rounded">Create Section</button>
                <button className="text-left p-3 rounded">Sustainable Habits</button>
              </nav>

              <div className="mt-auto pt-6">
                <button onClick={() => exportEntriesAsXlsx(sampleEntries)} className="w-full p-3 rounded bg-white/6">Export Excel</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AddHabitModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); handleAdded(); }} />
      <CreateSectionModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); handleCreated(); }} />
    </>
  )
}
