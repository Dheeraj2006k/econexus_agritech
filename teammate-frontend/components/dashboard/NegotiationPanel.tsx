'use client';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

type NegotiationSummary = {
  id: string;
  status: string;
};

type NegotiationStatus = {
  negotiation_id: string;
  status: string;
  crop?: string;
  quantity_kg?: number;
  urgency_score?: number;
  farmer?: { name?: string };
  buyer?: { business_name?: string };
  pricing?: {
    farmer_expected?: number;
    buyer_offered?: number;
    ai_suggested?: number;
    current?: number;
  };
  messages?: {
    round_1?: {
      reasoning?: string;
    };
  };
};

export default function NegotiationPanel() {
  const [negotiations, setNegotiations] = useState<NegotiationSummary[]>([]);
  const [selected, setSelected] = useState<NegotiationStatus | null>(null);
  const [approving, setApproving] = useState(false);
  const [done, setDone] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const selectedRef = useRef<NegotiationStatus | null>(null);

  const loadNegotiation = useCallback(async (id: string) => {
    const data = await apiFetch(`/negotiations/${id}/status`);
    setSelected(data);
    selectedRef.current = data;
    setDone(false);
  }, []);

  const fetchNegotiations = useCallback(async () => {
    const data = await apiFetch('/admin/dashboard');
    if (data.recent_negotiations) {
      setNegotiations(data.recent_negotiations);
      if (data.recent_negotiations.length > 0 && !selectedRef.current) {
        loadNegotiation(data.recent_negotiations[0].id);
      }
    }
  }, [loadNegotiation]);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    queueMicrotask(fetchNegotiations);
    const interval = setInterval(fetchNegotiations, 5000);
    return () => clearInterval(interval);
  }, [fetchNegotiations]);

  const speakDeal = () => {
    if (!selected || !synthRef.current) return;
    const text = `Deal summary. ${selected.farmer?.name} wants to sell ${selected.quantity_kg} kilograms of ${selected.crop}
    at ${selected.pricing?.farmer_expected} rupees per kg.
    ${selected.buyer?.business_name} offered ${selected.pricing?.buyer_offered} rupees.
    Our AI suggests a fair price of ${selected.pricing?.ai_suggested} rupees per kg.
    Do you approve this deal?`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    synthRef.current.speak(utterance);
  };

  const handleApprove = async (decision: string) => {
    if (!selected) return;
    setApproving(true);
    await apiFetch('/approval/decide', {
      method: 'POST',
      body: JSON.stringify({ negotiation_id: selected.negotiation_id, decision }),
    });
    setApproving(false);
    setDone(true);
    if (synthRef.current) {
      const msg = decision === 'approve' ? 'Deal approved successfully!' : 'Deal rejected.';
      synthRef.current.speak(new SpeechSynthesisUtterance(msg));
    }
    fetchNegotiations();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6 shadow-[0_0_40px_rgba(16,185,129,0.15)]">

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">AI Negotiation Engine</h2>
        <div className="flex items-center gap-3">
          <div className="text-emerald-400 animate-pulse text-sm">● LIVE</div>
          <button onClick={speakDeal}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition">
            🔊 Voice Summary
          </button>
        </div>
      </div>

      {negotiations.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {negotiations.map((n) => (
            <button key={n.id} onClick={() => loadNegotiation(n.id)}
              className={`px-3 py-1 rounded-lg text-xs border transition ${selected?.negotiation_id === n.id ? 'border-emerald-500 text-emerald-400' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
              {n.status.toUpperCase()} • {n.id.slice(0, 8)}...
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <>
          <p className="text-zinc-400 text-sm mb-4">
            {selected.crop} • {selected.quantity_kg}kg • Urgency: {selected.urgency_score}/100
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-zinc-800 rounded-xl p-5">
              <p className="text-zinc-400 text-sm">Farmer Expected</p>
              <h2 className="text-4xl font-bold mt-2">₹{selected.pricing?.farmer_expected}/kg</h2>
              <p className="text-zinc-500 text-xs mt-1">{selected.farmer?.name}</p>
            </div>
            <div className="bg-zinc-800 rounded-xl p-5">
              <p className="text-zinc-400 text-sm">Buyer Offer</p>
              <h2 className="text-4xl font-bold mt-2 text-orange-400">₹{selected.pricing?.buyer_offered || '—'}/kg</h2>
              <p className="text-zinc-500 text-xs mt-1">{selected.buyer?.business_name}</p>
            </div>
            <div className="bg-emerald-500 rounded-xl p-5 text-black">
              <p className="text-sm font-medium">AI Fair Price</p>
              <h2 className="text-4xl font-bold mt-2">₹{selected.pricing?.ai_suggested || '—'}/kg</h2>
              <p className="text-xs mt-1">Fairness optimized</p>
            </div>
          </div>

          {selected.messages?.round_1?.reasoning && (
            <div className="bg-zinc-800 rounded-xl p-4 mb-6">
              <p className="text-zinc-400 text-xs mb-1">AI REASONING</p>
              <p className="text-zinc-300 text-sm">{selected.messages.round_1.reasoning}</p>
            </div>
          )}

          {selected.status !== 'deal_closed' && !done && (
            <div className="flex gap-3">
              <button onClick={() => handleApprove('approve')} disabled={approving}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition disabled:opacity-50">
                {approving ? 'Processing...' : '✓ Approve Deal'}
              </button>
              <button onClick={() => handleApprove('reject')} disabled={approving}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 py-3 rounded-xl transition disabled:opacity-50">
                ✕ Reject
              </button>
            </div>
          )}

          {(selected.status === 'deal_closed' || done) && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
              <p className="text-emerald-400 font-bold">✓ Deal Executed Successfully</p>
              <p className="text-zinc-400 text-sm mt-1">
                Final: ₹{selected.pricing?.current}/kg
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-zinc-500 text-center py-8">No active negotiations</div>
      )}
    </motion.div>
  );
}
