// src/utils/sync.ts
import { supabase } from '../lib/supabase'

type HabitLocal = {
  id: string
  name: string
  unit?: string
  daily_goal?: number | null
  color?: string
  local?: boolean
  created_at?: string
  updated_at?: string
  user_id?: string | null
}

type EntryLocal = {
  id: string
  habit_id: string
  value: number
  entry_date: string // YYYY-MM-DD
  created_at?: string
  updated_at?: string
  local?: boolean
}

// helper: ensure timestamps exist
function nowISO() { return new Date().toISOString() }

export async function syncLocalToSupabase(opts: {
  onProgress?: (msg: string, pct?: number) => void
  abortSignal?: AbortSignal | null
}) {
  const onProgress = opts.onProgress ?? (() => {})
  try {
    onProgress('Starting sync', 0)

    // === 1) read local data ===
    const localHabits: HabitLocal[] = JSON.parse(localStorage.getItem('hj_local_habits') || '[]')
    const localEntries: EntryLocal[] = JSON.parse(localStorage.getItem('hj_local_entries') || '[]')

    onProgress(`Found ${localHabits.length} habit(s) and ${localEntries.length} entry(ies) locally.`, 5)

    // Will hold mapping from localId -> serverId (if server assigns new ids)
    const idMap: Record<string, string> = {}

    // === 2) sync habits (upsert) ===
    for (let i = 0; i < localHabits.length; i++) {
      if (opts.abortSignal?.aborted) throw new Error('Sync aborted')
      const h = localHabits[i]
      onProgress(`Syncing habit ${h.name}`, 5 + Math.round((i / Math.max(1, localHabits.length)) * 40))
      // prepare payload
      const payload: any = {
        name: h.name,
        unit: h.unit ?? null,
        daily_goal: h.daily_goal ?? null,
        color: h.color ?? null,
        updated_at: h.updated_at ?? h.created_at ?? nowISO(),
        user_id: h.user_id ?? null
      }

      try {
        if (!h.id.startsWith('local_')) {
          // likely already a server id — update
          const { data, error } = await supabase.from('habits').update(payload).eq('id', h.id).select().single()
          if (!error && data) {
            idMap[h.id] = data.id
          } else if (error && error.code === '42P01') {
            // table missing or RLS, skip gracefully
          }
        } else {
          // insert new on server and map ids
          const { data, error } = await supabase.from('habits').insert([payload]).select()
          if (!error && Array.isArray(data) && data.length > 0) {
            const serverId = data[0].id
            idMap[h.id] = serverId
            // update local copy to server id so future references align (we keep a local mapping too)
            // replace local id with server id in local storage (but keep a copy for safety)
            const cur = JSON.parse(localStorage.getItem('hj_local_habits') || '[]')
            const replaced = cur.map((x:any) => x.id === h.id ? { ...x, id: serverId, local: false } : x)
            localStorage.setItem('hj_local_habits', JSON.stringify(replaced))
          } else {
            // keep local if error
            console.warn('Habit insert error', error)
          }
        }
      } catch (e) {
        console.warn('Habit sync error', e)
      }
    }

    // === 3) update local entries that pointed to local habit ids -> rewrite habit_id to server ids ===
    if (Object.keys(idMap).length > 0) {
      let changed = false
      const entries = JSON.parse(localStorage.getItem('hj_local_entries') || '[]')
      const newEntries = entries.map((en:any) => {
        if (idMap[en.habit_id]) {
          changed = true
          return { ...en, habit_id: idMap[en.habit_id] }
        }
        return en
      })
      if (changed) {
        localStorage.setItem('hj_local_entries', JSON.stringify(newEntries))
        onProgress('Remapped local entry habit IDs to server IDs', 60)
      }
    }

    // === 4) sync entries (upsert) ===
    for (let i=0;i<localEntries.length;i++){
      if (opts.abortSignal?.aborted) throw new Error('Sync aborted')
      const en = localEntries[i]
      onProgress(`Syncing entry ${i+1}/${localEntries.length}`, 60 + Math.round((i / Math.max(1, localEntries.length)) * 30))

      const payload:any = {
        habit_id: en.habit_id,
        value: en.value,
        entry_date: en.entry_date,
        updated_at: en.updated_at ?? en.created_at ?? nowISO()
      }
      try {
        if (!en.id.startsWith('local_')) {
          await supabase.from('entries').update(payload).eq('id', en.id)
        } else {
          const { data, error } = await supabase.from('entries').insert([payload]).select()
          if (!error && Array.isArray(data) && data.length > 0) {
            const serverId = data[0].id
            // update local id -> server id mapping for entries as well
            const existing = JSON.parse(localStorage.getItem('hj_local_entries') || '[]')
            const replaced = existing.map((x:any) => x.id === en.id ? { ...x, id: serverId, local: false } : x)
            localStorage.setItem('hj_local_entries', JSON.stringify(replaced))
          } else {
            console.warn('Entry insert error', error)
          }
        }
      } catch (e) {
        console.warn('Entry sync error', e)
      }
    }

    onProgress('Finalizing sync', 95)

    // === 5) optional: refresh local cached data from server to ensure canonical state ===
    try {
      const { data: serverHabits } = await supabase.from('habits').select('*')
      const { data: serverEntries } = await supabase.from('entries').select('*').limit(2000)
      // Merge server results with local but prefer local if local has newer updated_at
      const localH = JSON.parse(localStorage.getItem('hj_local_habits') || '[]') as any[]
      const mergedHabits = mergeById(localH, serverHabits || [])
      localStorage.setItem('hj_local_habits', JSON.stringify(mergedHabits))

      const localE = JSON.parse(localStorage.getItem('hj_local_entries') || '[]') as any[]
      const mergedEntries = mergeById(localE, serverEntries || [])
      localStorage.setItem('hj_local_entries', JSON.stringify(mergedEntries))
      onProgress('Merged server data locally', 100)
    } catch (e) {
      console.warn('Final merge failed', e)
      onProgress('Sync completed (partial)', 100)
    }

    return { success: true }
  } catch (err:any) {
    onProgress(`Sync error: ${err?.message ?? String(err)}`, 100)
    return { success: false, error: err?.message ?? String(err) }
  }

  function mergeById(localArr:any[], remoteArr:any[]) {
    // build maps
    const mapL: Record<string, any> = {}
    for (const l of localArr) {
      mapL[l.id] = l
    }
    const out: any[] = []
    for (const r of remoteArr) {
      const lid = mapL[r.id]
      if (!lid) {
        out.push(r)
      } else {
        // choose the one with newer updated_at
        const lu = new Date(lid.updated_at ?? lid.created_at ?? 0).getTime()
        const ru = new Date(r.updated_at ?? r.created_at ?? 0).getTime()
        out.push(lu >= ru ? lid : r)
        delete mapL[r.id]
      }
    }
    // any remaining local-only
    for (const k of Object.keys(mapL)) out.unshift(mapL[k])
    return out
  }
}
