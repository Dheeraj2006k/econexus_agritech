'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API, saveAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState('farmer');
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!form.email || !form.password) {
      setError('Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, role })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }
      saveAuth(data.token, data.user);
      if (role === 'admin') router.push('/admin');
      else if (role === 'farmer') router.push('/farmer');
      else router.push('/buyer');
    } catch {
      setError('Connection failed. Is backend running?');
      setLoading(false);
    }
  };

  const roleConfig = {
    admin: { color: '#ff6b6b', label: 'ADMIN', hint: 'Email + Password' },
    farmer: { color: '#00ff88', label: 'FARMER', hint: 'Phone number as both username and password' },
    buyer: { color: '#00d4ff', label: 'BUYER', hint: 'Email + Password' },
  };

  return (
    <main className="min-h-screen bg-[#0a0f0a] flex items-center justify-center px-4">
      <div className="fixed inset-0 opacity-[0.02]"
        style={{ backgroundImage: 'linear-gradient(#00ff88 1px, transparent 1px), linear-gradient(90deg, #00ff88 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-[#00ff88] font-mono text-lg tracking-[0.4em]">ECONEXUS</span>
          </div>
          <p className="text-white/20 font-mono text-xs tracking-widest">AI AGRICULTURAL COORDINATION</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {Object.entries(roleConfig).map(([r, config]) => (
            <button key={r} onClick={() => setRole(r)}
              className="py-3 font-mono text-xs tracking-widest border transition-all"
              style={{
                borderColor: role === r ? config.color : 'rgba(255,255,255,0.1)',
                color: role === r ? config.color : 'rgba(255,255,255,0.3)',
                background: role === r ? `${config.color}10` : 'transparent'
              }}>
              {config.label}
            </button>
          ))}
        </div>

        <div className="border border-white/10 bg-white/[0.02] p-6 space-y-4 relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 transition-all"
            style={{ background: roleConfig[role].color }} />

          <p className="text-white/20 font-mono text-[10px] tracking-widest text-center">
            {roleConfig[role].hint}
          </p>

          <div>
            <p className="text-white/30 font-mono text-[10px] tracking-widest mb-1">
              {role === 'farmer' ? 'PHONE NUMBER' : 'EMAIL'}
            </p>
            <input
              type="text"
              placeholder={role === 'farmer' ? '9876543210' : 'you@example.com'}
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full bg-white/[0.03] border border-white/10 text-white font-mono text-sm px-4 py-3 outline-none focus:border-white/30 placeholder-white/20"
            />
          </div>

          <div>
            <p className="text-white/30 font-mono text-[10px] tracking-widest mb-1">PASSWORD</p>
            <input
              type="password"
              placeholder={role === 'farmer' ? 'Your phone number' : '••••••••'}
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full bg-white/[0.03] border border-white/10 text-white font-mono text-sm px-4 py-3 outline-none focus:border-white/30 placeholder-white/20"
            />
          </div>

          {error && (
            <p className="text-[#ff6b6b] font-mono text-xs text-center">{error}</p>
          )}

          <button onClick={handleLogin} disabled={loading}
            className="w-full py-4 font-mono text-sm tracking-widest border transition-all disabled:opacity-40"
            style={{
              borderColor: roleConfig[role].color,
              color: roleConfig[role].color,
              background: loading ? `${roleConfig[role].color}10` : 'transparent'
            }}>
            {loading ? 'AUTHENTICATING...' : `LOGIN AS ${roleConfig[role].label} →`}
          </button>
        </div>

        {role === 'buyer' && (
          <p className="text-center mt-4 font-mono text-xs text-white/30">
            New buyer?{' '}
            <a href="/register" className="text-[#00d4ff] hover:underline">Register here</a>
          </p>
        )}

        {role === 'farmer' && (
          <p className="text-center mt-4 font-mono text-xs text-white/20">
            Farmers are registered by admin. Contact your local EcoNexus center.
          </p>
        )}
      </div>
    </main>
  );
}
