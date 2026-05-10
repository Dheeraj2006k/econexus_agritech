'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      router.push('/login');
      return;
    }
    if (auth.user.role === 'admin') router.push('/admin');
    else if (auth.user.role === 'farmer') router.push('/farmer');
    else router.push('/buyer');
  }, [router]);

  return (
    <main className="min-h-screen bg-[#0a0f0a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border border-[#00ff88] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[#00ff88] font-mono text-xs tracking-widest">LOADING...</p>
      </div>
    </main>
  );
}
