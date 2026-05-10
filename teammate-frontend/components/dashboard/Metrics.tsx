'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function Metrics() {
  const [stats, setStats] = useState({
    total_farmers: 0,
    total_buyers: 0,
    active_listings: 0,
    total_deals: 0
  });

  useEffect(() => {
    apiFetch('/admin/dashboard').then(data => {
      if (data.stats) setStats(data.stats);
    });
  }, []);

  const metrics = [
    { title: 'Active Farmers', value: stats.total_farmers },
    { title: 'Active Buyers', value: stats.total_buyers },
    { title: 'Active Listings', value: stats.active_listings },
    { title: 'Deals Closed', value: stats.total_deals },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {metrics.map((item) => (
        <div key={item.title}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-emerald-500 transition">
          <p className="text-zinc-400 text-sm">{item.title}</p>
          <h2 className="text-3xl font-bold mt-2 text-emerald-400">{item.value}</h2>
        </div>
      ))}
    </div>
  );
}
