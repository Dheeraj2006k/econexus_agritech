'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Passport = {
  id?: string;
  name?: string;
  location?: string;
  passport_score?: number;
  genuinity_score?: number;
  delivery_reliability?: number;
  passport_tier?: string;
  passport_details?: {
    certifications?: string[];
  };
  recent_deals?: {
    id: string;
    final_price_per_kg?: number;
    total_value?: number;
  }[];
};

export default function TrustPassport({ userId, role }: { userId?: string; role?: string }) {
  const [passport, setPassport] = useState<Passport | null>(null);

  useEffect(() => {
    const id = userId || '2ed224fc-1fd7-4e91-9613-3ca396f7fd6a';
    const r = role || 'farmer';
    apiFetch(`/auth/passport/${id}/${r}`).then(setPassport);
  }, [userId, role]);

  if (!passport) return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-pulse">
      <div className="h-8 bg-zinc-800 rounded w-48 mb-4" />
      <div className="h-4 bg-zinc-800 rounded w-full mb-2" />
    </div>
  );

  const score = passport.passport_score || 0;
  const genuinity = passport.genuinity_score || 0;
  const reliability = passport.delivery_reliability || 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Digital Trust Passport</h2>
          <p className="text-zinc-400 text-sm mt-1">{passport.name}</p>
          <p className="text-zinc-500 text-xs">{passport.location}</p>
        </div>
        <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-black text-xl font-bold">
          {score}
        </div>
      </div>

      <div className="space-y-4 mb-4">
        {[
          { label: 'Trust Score', value: score, color: 'bg-emerald-500' },
          { label: 'Genuinity Score', value: genuinity, color: 'bg-emerald-500' },
          { label: 'Delivery Reliability', value: reliability, color: 'bg-orange-400' },
        ].map(bar => (
          <div key={bar.label}>
            <div className="flex justify-between mb-1">
              <span className="text-sm">{bar.label}</span>
              <span className="text-sm">{bar.value}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className={`h-full ${bar.color} transition-all`} style={{ width: `${bar.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
        <span className="text-zinc-400 text-sm">Passport Tier</span>
        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">
          {passport.passport_tier}
        </span>
      </div>

      {passport.passport_details?.certifications?.length ? (
        <div className="flex flex-wrap gap-2 mt-3">
          {passport.passport_details.certifications.map((c: string) => (
            <span key={c} className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-lg">{c}</span>
          ))}
        </div>
      ) : null}

      {passport.recent_deals?.length ? (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-zinc-400 text-xs mb-2">RECENT DEALS</p>
          {passport.recent_deals.slice(0, 3).map((deal) => (
            <div key={deal.id} className="flex justify-between text-sm py-1">
              <span className="text-zinc-400">₹{deal.final_price_per_kg}/kg</span>
              <span className="text-emerald-400">₹{deal.total_value?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
