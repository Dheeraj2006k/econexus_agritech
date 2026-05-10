'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function AIInsights() {
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    apiFetch('/admin/dashboard').then(data => {
      const listings = data.active_listings || [];
      const buyers = data.top_buyers || [];
      const negotiations = data.recent_negotiations || [];
      setInsights([
        `${listings.length} active listings are ready for matching.`,
        buyers[0] ? `${buyers[0].business_name || buyers[0].name} is the highest trust buyer at ${buyers[0].passport_score} points.` : 'No ranked buyers available yet.',
        negotiations.length ? `${negotiations.length} recent negotiations need monitoring.` : 'No active negotiations need attention.',
        listings.some((item: { urgency_score?: number }) => (item.urgency_score || 0) >= 80)
          ? 'High urgency listings detected. Prioritize buyer matching and logistics.'
          : 'Supply urgency is stable across current listings.'
      ]);
    });
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-6">AI Insights Engine</h2>

      <div className="space-y-4">
        {(insights.length ? insights : ['Loading AI insights...']).map((item) => (
          <div
            key={item}
            className="bg-zinc-800 rounded-xl p-4 border border-zinc-700"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
