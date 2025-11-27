// src/components/Header.tsx
import React from 'react'
import { supabase } from '../lib/supabase'
import Logo from './Logo'

export default function Header(): JSX.Element {
  const [user, setUser] = React.useState<any>(null)

  React.useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(res => {
      if (!mounted) return
      setUser(res.data.user ?? null)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
    })
    return () => {
      mounted = false
      data.subscription?.unsubscribe?.()
    }
  }, [])

  async function signIn() {
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google' })
    } catch (e) {
      console.warn('Sign in failed', e)
    }
  }
  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <header className="w-full bg-transparent/0 py-4 backdrop-blur-none">
      <div className="container flex items-center justify-between relative">
        <div className="flex items-center gap-3 z-10">
          <div className="p-1 rounded-md bg-white/3 backdrop-blur-sm">
            <Logo size={36} />
          </div>
          <div className="text-lg font-extrabold text-white tracking-tight">Habit Journal</div>
        </div>

        <div className="flex items-center gap-4 z-10">
          {user ? (
            <>
              <div className="text-sm text-gray-200">{user.email}</div>
              <button onClick={signOut} className="text-sm px-3 py-1 rounded bg-white/6 hover:bg-white/10">Sign out</button>
            </>
          ) : (
            <button onClick={signIn} className="text-sm px-3 py-1 rounded bg-gradient-to-r from-[#7EE7C6] to-[#14C38E] text-black font-semibold shadow-sm">Sign in</button>
          )}
        </div>
      </div>
    </header>
  )
}
