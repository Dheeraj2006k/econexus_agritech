'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Handshake,
  ShieldCheck,
  Activity,
  PlusCircle,
} from 'lucide-react'

const items = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Handshake, label: 'Negotiations', href: '/negotiations' },
  { icon: ShieldCheck, label: 'Passports', href: '/passports' },
  { icon: Users, label: 'Aggregation', href: '/aggregation' },
  { icon: Activity, label: 'Analytics', href: '/analytics' },
]

export default function Sidebar() {
  const [user, setUser] = useState<{ name?: string; role?: string } | null>(null)

  useEffect(() => {
    const u = localStorage.getItem('en_user')
    if (u) queueMicrotask(() => setUser(JSON.parse(u)))
  }, [])

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col sticky top-0 h-screen">
      <h1 className="text-2xl font-bold text-emerald-400 mb-8">Econexus</h1>

      <div className="bg-zinc-800 rounded-2xl p-4 mb-6 border border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-black font-bold text-lg">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="w-3 h-3 rounded-full bg-emerald-400 absolute bottom-0 right-0 border-2 border-zinc-800"></div>
          </div>
          <div>
            <h2 className="font-semibold">{user?.name || 'User'}</h2>
            <p className="text-zinc-400 text-sm capitalize">{user?.role || 'guest'}</p>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('en_token')
            localStorage.removeItem('en_user')
            window.location.href = '/login'
          }}
          className="mt-3 w-full text-xs text-zinc-500 hover:text-red-400 transition text-left"
        >
          → Logout
        </button>
      </div>

      {user?.role === 'farmer' && (
        <Link
          href="/listings/new"
          className="mb-6 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition-all text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Post Crop Listing
        </Link>
      )}

      {user?.role === 'buyer' && (
        <Link
          href="/listings"
          className="mb-6 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition-all text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Browse Listings
        </Link>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 hover:border hover:border-emerald-500 transition"
          >
            <item.icon className="w-5 h-5 text-emerald-400" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
