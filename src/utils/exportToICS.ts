// src/utils/exportToICS.ts
export function entriesToICS(entries: any[], habits: any[]) {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HabitJournal//EN'
  ]

  for (const e of entries) {
    const habit = habits.find((h: any) => h.id === e.habit_id) || { name: 'Habit', unit: '' }
    const date = (e.entry_date || '').replace(/-/g, '')
    const uid = `hj-${e.id || Math.random().toString(36).slice(2)}@habit-journal`
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`)
    // All-day event for date (DTSTART/DTEND as DATE)
    lines.push(`DTSTART;VALUE=DATE:${date}`)
    lines.push(`SUMMARY:${habit.name} — ${e.value}${habit.unit ? ' ' + habit.unit : ''}`)
    lines.push(`DESCRIPTION:Recorded by Habit Journal`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadICS(text: string, filename = 'habit-entries.ics') {
  const blob = new Blob([text], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
