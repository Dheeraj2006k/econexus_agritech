'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAuth, API } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState('farmer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }
      saveAuth(data.token, data.user);
      router.push('/dashboard');
    } catch {
      setError('Connection failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-emerald-400 mb-2 text-center">EcoNexus</h1>
        <p className="text-zinc-400 text-center text-sm mb-8">AI Agricultural Coordination</p>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {['admin', 'farmer', 'buyer'].map(r => (
            <button key={r} onClick={() => setRole(r)}
              className={`py-2 rounded-xl text-sm font-medium border transition capitalize ${role === r ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
              {r}
            </button>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">
              {role === 'farmer' ? 'Phone Number' : 'Email'}
            </label>
            <input type="text"
              placeholder={role === 'farmer' ? '9876543210' : 'you@example.com'}
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 outline-none transition" />
          </div>
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Password</label>
            <input type="password"
              placeholder={role === 'farmer' ? 'Your phone number' : '••••••••'}
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 outline-none transition" />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button onClick={login} disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition disabled:opacity-50">
            {loading ? 'Logging in...' : `Login as ${role}`}
          </button>
        </div>

        {role === 'buyer' && (
          <p className="text-center mt-4 text-zinc-400 text-sm">
            New buyer? <a href="/register" className="text-emerald-400 hover:underline">Register here</a>
          </p>
        )}
      </div>
    </div>
  );
}
