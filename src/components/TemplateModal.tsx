// src/components/TemplateModal.tsx
import React from 'react'

const TEMPLATES = [
  { name: 'Daily Walk', unit: 'steps', daily_goal: 10000, color: '#14C38E' },
  { name: 'Reading', unit: 'minutes', daily_goal: 30, color: '#7EE7C6' },
  { name: 'Water Intake', unit: 'ml', daily_goal: 2000, color: '#00B0FF' },
  { name: 'Recycle', unit: 'grams', daily_goal: 300, color: '#FFD75A' }
]

export default function TemplateModal({ open, onClose, onPick }:{open:boolean; onClose:()=>void; onPick:(tpl:any)=>void}){
  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative bg-[#0f1724] p-6 rounded-2xl w-full max-w-md text-white">
        <h3 className="text-xl mb-4">Templates</h3>
        <div className="grid gap-3">
          {TEMPLATES.map(t=>(
            <div key={t.name} className="p-3 rounded bg-white/4 flex justify-between items-center">
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm text-muted">{t.daily_goal} {t.unit}</div>
              </div>
              <button onClick={()=>{ onPick(t); onClose() }} className="px-3 py-2 rounded bg-gradient-to-r from-[#7EE7C6] to-[#14C38E] text-black">Use</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
