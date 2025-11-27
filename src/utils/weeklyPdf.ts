// src/utils/weeklyPdf.ts
export function openWeeklyPrint(weekStartISO?: string) {
  // weekStartISO e.g. '2025-11-10' (Sunday). Default = current week.
  const start = weekStartISO ? new Date(weekStartISO) : (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d })()
  const dates = Array.from({length:7}).map((_,i) => { const d=new Date(start); d.setDate(start.getDate()+i); return d.toISOString().slice(0,10) })
  const entries = JSON.parse(localStorage.getItem('hj_local_entries') || '[]')
  const habits = JSON.parse(localStorage.getItem('hj_local_habits') || '[]')

  // Build simple HTML
  let html = `<html><head><title>Weekly Habit Report</title><style>
    body{font-family:Inter,system-ui,Segoe UI,Roboto,Arial;margin:20px;color:#111;background:#fff}
    .h{font-size:22px;margin-bottom:10px}
    .day{margin-bottom:14px;padding:10px;border:1px solid #eee;border-radius:6px}
    .pill{display:inline-block;padding:6px 8px;border-radius:999px;margin-right:8px;margin-bottom:6px}
  </style></head><body>`
  html += `<div class="h">Weekly Habit Summary: ${dates[0]} → ${dates[6]}</div>`
  for (const d of dates) {
    html += `<div class="day"><strong>${d}</strong><div style="margin-top:6px">`
    const dayEntries = (entries.filter((e:any)=>e.entry_date===d) || []).map((en:any)=> {
      const h = habits.find((hh:any)=>hh.id===en.habit_id) || { name: 'Habit', color: '#bbb', unit: '' }
      return `<div class="pill" style="background:${(h.color||'#ddd')};padding:6px;border-radius:6px;color:#000">${h.name}: ${en.value}${h.unit?` ${h.unit}`:''}</div>`
    })
    if (dayEntries.length===0) html += `<div style="color:#666">No entries</div>`
    else html += dayEntries.join('')
    html += `</div></div>`
  }
  html += `<script>window.onload = ()=> { setTimeout(()=>{ window.print(); }, 120); }</script></body></html>`

  const w = window.open('', '_blank', 'noopener,width=900,height=800')
  if (!w) { alert('Pop-up blocked — allow pop-ups to print/export.') ; return }
  w.document.write(html)
  w.document.close()
}
