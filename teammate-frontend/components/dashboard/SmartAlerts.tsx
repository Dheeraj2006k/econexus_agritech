'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Alert = {
  title: string;
  desc: string;
};

type Listing = {
  crop_name?: string;
  quantity_kg?: number;
  urgency_score?: number;
  location_district?: string;
  expiry_days?: number;
};

export default function SmartAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    apiFetch('/admin/dashboard').then(data => {
      const listings: Listing[] = data.active_listings || [];
      const nextAlerts = listings
        .filter(item => (item.urgency_score || 0) >= 70 || (item.expiry_days || 99) <= 2)
        .slice(0, 3)
        .map(item => ({
          title: (item.urgency_score || 0) >= 80 ? 'High Urgency Listing' : 'Freshness Watch',
          desc: `${item.crop_name || 'Crop'} • ${item.quantity_kg || 0}kg • ${item.location_district || 'Unknown district'}`
        }));

      setAlerts(nextAlerts.length ? nextAlerts : [
        { title: 'System Stable', desc: 'No urgent listings or logistics alerts right now.' }
      ]);
    });
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-6">Smart Alerts</h2>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={`${alert.title}-${alert.desc}`}
            className="bg-zinc-800 rounded-xl p-4"
          >
            <h3 className="font-semibold text-emerald-400">{alert.title}</h3>
            <p className="text-zinc-400 mt-1">{alert.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
