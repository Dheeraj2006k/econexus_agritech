'use client'

import { useEffect, useState } from 'react'
import { logout } from '@/lib/api'

type User = {
  name?: string
  role?: string
  passport_score?: number
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('en_user')
    if (saved) queueMicrotask(() => setUser(JSON.parse(saved)))
  }, [])

  return (
    <div className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
      <div>
        <h2 className="text-xl font-semibold">
          AI Coordination Dashboard
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-sm text-zinc-300">
            AI Coordination Active
          </span>
        </div>

        <div className="text-right hidden sm:block">
          <p className="text-sm text-white">{user?.name || 'User'}</p>
          <p className="text-xs text-zinc-500 capitalize">
            {user?.role || 'guest'}{user?.passport_score ? ` • ${user.passport_score}pts` : ''}
          </p>
        </div>

        <button onClick={logout}
          className="border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-400/40 text-xs px-3 py-2 rounded-lg transition">
          Logout
        </button>
      </div>
    </div>
  )
}
