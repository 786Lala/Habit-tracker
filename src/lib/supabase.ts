// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

function makeNoopSupabase() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: async () => ({ error: new Error('Supabase not configured') }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      insert: async () => ({ error: new Error('Supabase not configured') }),
      select: async () => ({ data: null, error: new Error('Supabase not configured') }),
      update: async () => ({ error: new Error('Supabase not configured') }),
      delete: async () => ({ error: new Error('Supabase not configured') }),
    }),
  } as unknown as ReturnType<typeof createClient>
}

export const supabase =
  typeof url === 'string' && url.length > 0 && typeof key === 'string' && key.length > 0
    ? createClient(url, key)
    : (() => {
        // Helpful console message for you during development
        // eslint-disable-next-line no-console
        console.warn('[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set — running in mock mode.')
        return makeNoopSupabase()
      })()
