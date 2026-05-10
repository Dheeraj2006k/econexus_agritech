'use client';

import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

type NegotiationSummary = { id: string; status: string };

type Message = { role: string; content: string; timestamp?: string };

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
  messages?: Record<string, { reasoning?: string; role?: string; content?: string }>;
};

const VOICE_LANGS = [
  { label: 'English', code: 'en-IN' },
  { label: 'Telugu', code: 'te-IN' },
  { label: 'Hindi', code: 'hi-IN' },
];

const AGENT_COLORS: Record<string, string> = {
  farmer_agent: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  buyer_agent: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  super_agent: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
  ai: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
  system: 'bg-zinc-700/50 border-zinc-600 text-zinc-400',
};

const AGENT_LABELS: Record<string, string> = {
  farmer_agent: '🌾 Farmer Agent',
  buyer_agent: '🏪 Buyer Agent',
  super_agent: '🤖 Super Agent',
  ai: '✨ Gemini AI',
  system: '⚙️ System',
};

function buildChatMessages(neg: NegotiationStatus): Message[] {
  const msgs: Message[] = [];
  if (!neg.messages) return msgs;

  msgs.push({
    role: 'system',
    content: `Negotiation started for ${neg.crop} • ${neg.quantity_kg}kg • Urgency ${neg.urgency_score}/100`,
  });

  msgs.push({
    role: 'farmer_agent',
    content: `I represent ${neg.farmer?.name}. Asking price: ₹${neg.pricing?.farmer_expected}/kg for ${neg.quantity_kg}kg of ${neg.crop}. Quality grade A, urgency is high.`,
  });

  if (neg.pricing?.buyer_offered) {
    msgs.push({
      role: 'buyer_agent',
      content: `${neg.buyer?.business_name} here. We can offer ₹${neg.pricing.buyer_offered}/kg. Market rates support this price range.`,
    });
  }

  Object.values(neg.messages).forEach((val) => {
    if (val?.reasoning) {
      msgs.push({
        role: 'ai',
        content: val.reasoning,
      });
    }
    if (val?.content && val?.role) {
      msgs.push({ role: val.role, content: val.content });
    }
  });

  if (neg.pricing?.ai_suggested) {
    msgs.push({
      role: 'super_agent',
      content: `After analyzing market data and both parties' positions, I recommend ₹${neg.pricing.ai_suggested}/kg as a fair price. This balances farmer profitability with buyer budget.`,
    });
  }

  if (neg.status === 'deal_closed') {
    msgs.push({
      role: 'system',
      content: `✅ Deal closed at ₹${neg.pricing?.current}/kg. Total value: ₹${((neg.pricing?.current || 0) * (neg.quantity_kg || 0)).toLocaleString()}`,
    });
  }

  return msgs;
}

export default function NegotiationPanel() {
  const [negotiations, setNegotiations] = useState<NegotiationSummary[]>([]);
  const [selected, setSelected] = useState<NegotiationStatus | null>(null);
  const [approving, setApproving] = useState(false);
  const [done, setDone] = useState(false);
  const [voiceLang, setVoiceLang] = useState('en-IN');
  const [showChat, setShowChat] = useState(true);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const selectedRef = useRef<NegotiationStatus | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const loadNegotiation = useCallback(async (id: string) => {
    const data = await apiFetch(`/negotiations/${id}/status`);
    setSelected(data);
    selectedRef.current = data;
    setDone(false);
  }, []);

  const fetchNegotiations = useCallback(async () => {
    const data = await apiFetch('/admin/dashboard');
    if (data.recent_negotiations?.length > 0) {
      setNegotiations(data.recent_negotiations);
      if (!selectedRef.current) {
        loadNegotiation(data.recent_negotiations[0].id);
      } else {
        const refreshed = await apiFetch(`/negotiations/${selectedRef.current.negotiation_id}/status`);
        setSelected(refreshed);
        selectedRef.current = refreshed;
      }
    }
  }, [loadNegotiation]);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    queueMicrotask(fetchNegotiations);
    const interval = setInterval(fetchNegotiations, 5000);
    return () => clearInterval(interval);
  }, [fetchNegotiations]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected]);

  const speakDeal = () => {
    if (!selected || !synthRef.current) return;
    synthRef.current.cancel();
    const text = `Deal summary. ${selected.farmer?.name} wants to sell ${selected.quantity_kg} kilograms of ${selected.crop}
    at ${selected.pricing?.farmer_expected} rupees per kg.
    ${selected.buyer?.business_name} offered ${selected.pricing?.buyer_offered || 'no offer yet'} rupees.
    AI suggests a fair price of ${selected.pricing?.ai_suggested || 'calculating'} rupees per kg.
    Do you approve this deal?`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang;
    utterance.rate = 0.9;
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
      const utterance = new SpeechSynthesisUtterance(
        decision === 'approve' ? 'Deal approved successfully!' : 'Deal rejected.'
      );
      utterance.lang = voiceLang;
      synthRef.current.speak(utterance);
    }
    fetchNegotiations();
  };

  const chatMessages = selected ? buildChatMessages(selected) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6 shadow-[0_0_40px_rgba(16,185,129,0.15)]"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">AI Negotiation Engine</h2>
        <div className="flex items-center gap-3">
          <div className="text-emerald-400 animate-pulse text-sm">● LIVE</div>
          <button
            onClick={speakDeal}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition"
          >
            🔊 Voice Summary
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-zinc-500 text-xs">Voice:</span>
        {VOICE_LANGS.map(lang => (
          <button
            key={lang.code}
            onClick={() => setVoiceLang(lang.code)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition ${
              voiceLang === lang.code ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {negotiations.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {negotiations.map((n) => (
            <button
              key={n.id}
              onClick={() => loadNegotiation(n.id)}
              className={`px-3 py-1 rounded-lg text-xs border transition ${
                selected?.negotiation_id === n.id
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
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

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="bg-zinc-800 rounded-xl p-5">
              <p className="text-zinc-400 text-sm">Farmer Expected</p>
              <h2 className="text-4xl font-bold mt-2">₹{selected.pricing?.farmer_expected}/kg</h2>
              <p className="text-zinc-500 text-xs mt-1">{selected.farmer?.name}</p>
            </div>
            <div className="bg-zinc-800 rounded-xl p-5">
              <p className="text-zinc-400 text-sm">Buyer Offer</p>
              <h2 className={`text-4xl font-bold mt-2 ${selected.pricing?.buyer_offered ? 'text-orange-400' : 'text-zinc-600'}`}>
                {selected.pricing?.buyer_offered ? `₹${selected.pricing.buyer_offered}/kg` : 'Pending...'}
              </h2>
              <p className="text-zinc-500 text-xs mt-1">{selected.buyer?.business_name}</p>
            </div>
            <div className="bg-emerald-500 rounded-xl p-5 text-black">
              <p className="text-sm font-medium">AI Fair Price</p>
              <h2 className="text-4xl font-bold mt-2">
                {selected.pricing?.ai_suggested ? `₹${selected.pricing.ai_suggested}/kg` : 'Calculating...'}
              </h2>
              <p className="text-xs mt-1">Fairness optimized</p>
            </div>
          </div>

          <button
            onClick={() => setShowChat(value => !value)}
            className="text-xs text-zinc-400 hover:text-emerald-400 mb-3 transition flex items-center gap-1"
          >
            {showChat ? '▲ Hide' : '▼ Show'} AI Agent Chat
          </button>

          {showChat && (
            <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4 mb-4 max-h-64 overflow-y-auto space-y-3">
              {chatMessages.length === 0 ? (
                <p className="text-zinc-600 text-xs text-center py-4">Agents initializing...</p>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={`${msg.role}-${i}`} className={`rounded-xl border px-4 py-3 text-sm ${AGENT_COLORS[msg.role] || AGENT_COLORS.system}`}>
                    <p className="text-xs font-bold mb-1 opacity-70">
                      {AGENT_LABELS[msg.role] || msg.role}
                    </p>
                    <p>{msg.content}</p>
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>
          )}

          {selected.status !== 'deal_closed' && !done && (
            <div className="flex gap-3">
              <button
                onClick={() => handleApprove('approve')}
                disabled={approving}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition disabled:opacity-50"
              >
                {approving ? 'Processing...' : '✓ Approve Deal'}
              </button>
              <button
                onClick={() => handleApprove('reject')}
                disabled={approving}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 py-3 rounded-xl transition disabled:opacity-50"
              >
                ✕ Reject
              </button>
            </div>
          )}

          {(selected.status === 'deal_closed' || done) && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
              <p className="text-emerald-400 font-bold">✓ Deal Executed Successfully</p>
              <p className="text-zinc-400 text-sm mt-1">Final: ₹{selected.pricing?.current}/kg</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-zinc-500 text-center py-8">No active negotiations</div>
      )}
    </motion.div>
  );
}
