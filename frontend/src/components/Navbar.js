'use client';
import { getAuth, logout } from '@/lib/auth';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    if (auth) queueMicrotask(() => setUser(auth.user));
  }, []);

  if (!user) return null;

  const roleColor = {
    admin: '#ff6b6b',
    farmer: '#00ff88',
    buyer: '#00d4ff'
  }[user.role] || '#ffffff';

  return (
    <nav className="border-b border-white/10 px-6 py-3 flex items-center justify-between bg-[#0a0f0a]/95 backdrop-blur sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: roleColor }} />
        <span className="text-white font-mono text-sm tracking-widest">ECONEXUS</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-white text-xs font-mono">{user.name}</p>
          <p className="text-xs font-mono tracking-widest" style={{ color: roleColor }}>
            {user.role.toUpperCase()}
            {user.passport_score ? ` • ${user.passport_score}pts` : ''}
          </p>
        </div>
        <button onClick={logout}
          className="border border-white/20 text-white/40 text-xs px-3 py-1.5 font-mono tracking-widest hover:border-white/40 hover:text-white/70 transition-all">
          LOGOUT
        </button>
      </div>
    </nav>
  );
}
