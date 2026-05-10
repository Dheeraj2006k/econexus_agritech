'use client';
import { useEffect, useState } from 'react';
import { agentFetch, getAuth } from '@/lib/api';

type AggregationResult = {
  crop_needed?: string;
  quantity_needed?: number;
  total_aggregated?: number;
  fulfillment_possible?: boolean;
  combined_price?: number;
  farmers_selected?: number;
  aggregation_plan?: string;
  agent_log?: string[];
};

export default function AggregationView() {
  const [data, setData] = useState<AggregationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const buyerId = auth?.user?.id || '7c5bdda6-a4b5-4f0a-82d5-3d191c12d7c8';

    agentFetch('/special/run', {
      method: 'POST',
      body: JSON.stringify({
        buyer_id: buyerId,
        crop_needed: 'Tomatoes',
        quantity_needed: 5000,
        budget_per_kg: 28
      })
    }).then(result => {
      setData(result);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
      <h2 className="text-2xl font-bold mb-6">Cooperative Aggregation</h2>

      {loading ? (
        <div className="text-zinc-500 py-8">Running special agent...</div>
      ) : (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-zinc-800 rounded-xl p-4">
              <h3 className="font-semibold">Farmers Ranked</h3>
              <p className="text-emerald-400 text-2xl font-bold mt-2">{data?.farmers_selected || 0}</p>
            </div>
            <div className="bg-zinc-800 rounded-xl p-4">
              <h3 className="font-semibold">Aggregated</h3>
              <p className="text-emerald-400 text-2xl font-bold mt-2">{data?.total_aggregated || 0}kg</p>
            </div>
            <div className="bg-zinc-800 rounded-xl p-4">
              <h3 className="font-semibold">Pooled Price</h3>
              <p className="text-emerald-400 text-2xl font-bold mt-2">₹{data?.combined_price || '—'}</p>
            </div>
            <div className="bg-emerald-500 rounded-xl p-4 text-black">
              <h3 className="font-semibold">Buyer Need</h3>
              <p className="text-2xl font-bold mt-2">5000kg</p>
            </div>
          </div>

          {data?.aggregation_plan && (
            <p className="bg-zinc-800 rounded-xl p-4 mt-4 text-zinc-300">{data.aggregation_plan}</p>
          )}

          {data?.agent_log?.length ? (
            <div className="mt-4 space-y-2">
              {data.agent_log.slice(0, 6).map((log, index) => (
                <p key={`${log}-${index}`} className="text-sm text-zinc-400 bg-zinc-800 rounded-xl p-3">{log}</p>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
