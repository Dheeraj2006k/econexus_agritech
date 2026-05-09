'use client';
import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const AGENT_API = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8000/api/agents';

const FARMER_ID = '2ed224fc-1fd7-4e91-9613-3ca396f7fd6a';
const BUYER_ID = '7c5bdda6-a4b5-4f0a-82d5-3d191c12d7c8';

export default function App() {
  const [screen, setScreen] = useState('dashboard');
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installState, setInstallState] = useState('idle');
  const [isInstalled, setIsInstalled] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API}/admin/dashboard`);
      const data = await res.json();
      setDashData(data);
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
    const initial = setTimeout(fetchDashboard, 0);
    const t1 = setInterval(fetchDashboard, 15000);
    const t2 = setInterval(() => setTime(new Date()), 1000);
    return () => { clearTimeout(initial); clearInterval(t1); clearInterval(t2); };
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    queueMicrotask(() => setIsInstalled(standalone));

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setInstallState('ready');
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setInstallState('installed');
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (isInstalled) {
      setInstallState('installed');
      return;
    }

    if (!installPrompt) {
      setInstallState('manual');
      return;
    }

    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallState(choice.outcome === 'accepted' ? 'installed' : 'dismissed');
    setIsInstalled(choice.outcome === 'accepted');
  };

  const screens = {
    dashboard: <Dashboard data={dashData} loading={loading} time={time} setScreen={setScreen} installState={installState} isInstalled={isInstalled} onInstall={installApp} />,
    listing: <ListingScreen setScreen={setScreen} />,
    agent: <AgentScreen setScreen={setScreen} />,
    negotiate: <NegotiateScreen setScreen={setScreen} />,
    approve: <ApproveScreen setScreen={setScreen} />,
    deal: <DealScreen setScreen={setScreen} />,
  };

  return (
    <div className="min-h-screen bg-[#0a0f0a] max-w-md mx-auto relative overflow-hidden">
      {/* Grid bg */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#00ff88 1px, transparent 1px), linear-gradient(90deg, #00ff88 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <div className="relative z-10 min-h-screen flex flex-col">
        {screens[screen]}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t border-white/10 bg-[#0a0f0a]/95 backdrop-blur px-6 py-3 flex justify-around z-50">
        {[
          { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
          { id: 'listing', icon: '＋', label: 'List Crop' },
          { id: 'agent', icon: '◈', label: 'Agents' },
          { id: 'negotiate', icon: 'LIVE', label: 'Live Deal' },
        ].map(item => (
          <button key={item.id} onClick={() => setScreen(item.id)}
            className={`flex flex-col items-center gap-1 text-xs transition-all ${screen === item.id ? 'text-[#00ff88]' : 'text-white/30'}`}>
            <span className="text-lg">{item.icon}</span>
            <span className="tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── SCREEN 1: DASHBOARD ──
function Dashboard({ data, loading, time, setScreen, installState, isInstalled, onInstall }) {
  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border border-[#00ff88] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[#00ff88] text-xs tracking-widest shimmer">LOADING...</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 pb-20 slide-up">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 bg-[#00ff88] rounded-full pulse-dot" />
              <span className="text-[#00ff88] text-xs tracking-[0.3em]">ECONEXUS AI</span>
            </div>
            <p className="text-white/30 text-xs">{time.toLocaleTimeString()} • LIVE</p>
          </div>
          <InstallButton installState={installState} isInstalled={isInstalled} onInstall={onInstall} />
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 pt-5 grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'FARMERS', value: data?.stats?.total_farmers || 0, color: '#00ff88' },
          { label: 'BUYERS', value: data?.stats?.total_buyers || 0, color: '#00d4ff' },
          { label: 'LISTINGS', value: data?.stats?.active_listings || 0, color: '#ffaa00' },
          { label: 'DEALS', value: data?.stats?.total_deals || 0, color: '#ff6b6b' },
        ].map(s => (
          <div key={s.label} className="border border-white/10 bg-white/[0.02] p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: s.color }} />
            <p className="text-white/30 text-[10px] tracking-widest mb-1">{s.label}</p>
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="px-5 mb-5">
        <p className="text-white/30 text-[10px] tracking-widest mb-3">AI PIPELINE</p>
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-1 flex-wrap">
            {['REG', 'PASSPORT', 'AGENT', 'LIST', 'MATCH', 'NEGOTIATE', 'APPROVE', 'DEAL'].map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 bg-[#00ff88] rounded-full" />
                  <span className="text-[8px] text-[#00ff88]/50 mt-0.5">{s}</span>
                </div>
                {i < 7 && <div className="w-3 h-px bg-[#00ff88]/30 mb-3" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Deals */}
      <div className="px-5 mb-5">
        <p className="text-white/30 text-[10px] tracking-widest mb-3">RECENT DEALS</p>
        {(data?.recent_deals || []).length === 0
          ? <p className="text-white/20 text-xs text-center py-6 border border-white/5">No deals yet</p>
          : (data?.recent_deals || []).map(deal => (
            <div key={deal.id} className="border border-[#00ff88]/20 bg-[#00ff88]/[0.02] p-4 mb-2">
              <div className="flex justify-between items-center">
                <span className="text-[#00ff88] text-xs">DEAL CLOSED</span>
                <span className="text-white/30 text-xs">₹{deal.total_value?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-white/50 text-xs">₹{deal.final_price_per_kg}/kg</span>
                <span className="text-white/30 text-xs">{deal.final_quantity_kg}kg</span>
              </div>
            </div>
          ))
        }
      </div>

      {/* Quick Action */}
      <div className="px-5 space-y-3">
        <button onClick={() => setScreen('negotiate')}
          className="w-full border border-[#00d4ff]/60 bg-[#00d4ff]/[0.04] text-[#00d4ff] py-4 text-sm tracking-widest hover:bg-[#00d4ff]/10 transition-all">
          START LIVE NEGOTIATION DEMO
        </button>
        <button onClick={() => setScreen('listing')}
          className="w-full border border-[#00ff88]/50 text-[#00ff88] py-4 text-sm tracking-widest hover:bg-[#00ff88]/10 transition-all">
          + POST NEW CROP LISTING
        </button>
      </div>
    </div>
  );
}

// ── SCREEN 2: POST LISTING ──
function InstallButton({ installState, isInstalled, onInstall }) {
  const label = isInstalled || installState === 'installed'
    ? 'INSTALLED'
    : installState === 'manual'
      ? 'MENU INSTALL'
      : 'INSTALL APP';

  return (
    <button
      type="button"
      onClick={onInstall}
      disabled={isInstalled || installState === 'installed'}
      className="shrink-0 border border-[#00ff88]/40 px-3 py-2 text-[10px] tracking-widest text-[#00ff88] transition-all hover:bg-[#00ff88]/10 disabled:border-white/10 disabled:text-white/25 disabled:hover:bg-transparent"
      aria-label="Install EcoNexus app"
      title="Install EcoNexus app"
    >
      {label}
    </button>
  );
}

function ListingScreen({ setScreen }) {
  const [form, setForm] = useState({
    crop_name: '', crop_category: 'vegetables',
    quantity_kg: '', expected_price_per_kg: '',
    expiry_days: '4', location_village: '', location_district: '',
    quality_grade: 'A', description: ''
  });
  const [loading, setLoading] = useState(false);
  const [listingId, setListingId] = useState(null);

  const submit = async () => {
    if (!form.crop_name || !form.quantity_kg || !form.expected_price_per_kg) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/listings/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, farmer_id: FARMER_ID, quantity_kg: Number(form.quantity_kg), expected_price_per_kg: Number(form.expected_price_per_kg), expiry_days: Number(form.expiry_days) })
      });
      const data = await res.json();
      setListingId(data.listing_id);
      setLoading(false);
    } catch (e) { setLoading(false); }
  };

  if (listingId) return (
    <div className="flex-1 pb-20 flex flex-col items-center justify-center px-5 slide-up">
      <div className="w-16 h-16 border-2 border-[#00ff88] flex items-center justify-center mb-6">
        <span className="text-[#00ff88] text-2xl">✓</span>
      </div>
      <p className="text-[#00ff88] tracking-widest text-sm mb-2">LISTING LIVE</p>
      <p className="text-white/40 text-xs text-center mb-8">AI Agent is searching for buyers...</p>
      <button onClick={() => setScreen('agent')}
        className="w-full border border-[#00ff88]/50 text-[#00ff88] py-4 text-sm tracking-widest">
        VIEW AGENT ACTIVITY →
      </button>
    </div>
  );

  return (
    <div className="flex-1 pb-20 slide-up">
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <p className="text-[#ffaa00] text-xs tracking-widest">POST CROP LISTING</p>
        <p className="text-white/30 text-xs mt-1">Farmer: Raju Kumar</p>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {[
          { key: 'crop_name', label: 'CROP NAME', placeholder: 'e.g. Fresh Tomatoes' },
          { key: 'quantity_kg', label: 'QUANTITY (KG)', placeholder: 'e.g. 500', type: 'number' },
          { key: 'expected_price_per_kg', label: 'EXPECTED PRICE (₹/KG)', placeholder: 'e.g. 30', type: 'number' },
          { key: 'expiry_days', label: 'EXPIRY (DAYS)', placeholder: 'e.g. 4', type: 'number' },
          { key: 'location_village', label: 'VILLAGE', placeholder: 'e.g. Chevella' },
          { key: 'location_district', label: 'DISTRICT', placeholder: 'e.g. Rangareddy' },
        ].map(f => (
          <div key={f.key}>
            <p className="text-white/30 text-[10px] tracking-widest mb-1">{f.label}</p>
            <input
              type={f.type || 'text'}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              className="w-full bg-white/[0.03] border border-white/10 text-white text-sm px-4 py-3 outline-none focus:border-[#00ff88]/50 placeholder-white/20 font-mono"
            />
          </div>
        ))}

        <button onClick={submit} disabled={loading}
          className="w-full border border-[#ffaa00]/50 text-[#ffaa00] py-4 text-sm tracking-widest mt-4 disabled:opacity-50">
          {loading ? 'CREATING LISTING...' : 'DEPLOY AI AGENT →'}
        </button>
      </div>
    </div>
  );
}

// ── SCREEN 3: AGENT ACTIVITY ──
function AgentScreen({ setScreen }) {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [listingId, setListingId] = useState('');
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const runAgent = async () => {
    if (!listingId) return;
    setRunning(true);
    setLogs([]);
    setResult(null);

    try {
      const res = await fetch(`${AGENT_API}/farmer/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmer_id: FARMER_ID, listing_id: listingId })
      });
      const data = await res.json();

      // Stream logs with delay for visual effect
      for (let i = 0; i < (data.agent_log || []).length; i++) {
        await new Promise(r => setTimeout(r, 400));
        setLogs(prev => [...prev, data.agent_log[i]]);
      }
      setResult(data);
      setRunning(false);
    } catch (e) {
      setLogs(prev => [...prev, 'ERROR: Agent failed to connect']);
      setRunning(false);
    }
  };

  return (
    <div className="flex-1 pb-20 slide-up">
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          {running && <div className="w-2 h-2 bg-[#00d4ff] rounded-full pulse-dot" />}
          <p className="text-[#00d4ff] text-xs tracking-widest">
            {running ? 'AGENT RUNNING...' : 'FARMER AI AGENT'}
          </p>
        </div>
        <p className="text-white/30 text-xs mt-1">Layer 1 — Local Agent</p>
      </div>

      <div className="px-5 pt-5">
        <p className="text-white/30 text-[10px] tracking-widest mb-1">LISTING ID</p>
        <input
          placeholder="Paste listing ID here"
          value={listingId}
          onChange={e => setListingId(e.target.value)}
          className="w-full bg-white/[0.03] border border-white/10 text-white text-xs px-4 py-3 outline-none focus:border-[#00d4ff]/50 placeholder-white/20 font-mono mb-4"
        />

        <button onClick={runAgent} disabled={running || !listingId}
          className="w-full border border-[#00d4ff]/50 text-[#00d4ff] py-3 text-sm tracking-widest mb-5 disabled:opacity-30">
          {running ? 'AGENT ACTIVE...' : 'RUN FARMER AGENT →'}
        </button>

        {/* Agent log terminal */}
        {logs.length > 0 && (
          <div className="border border-white/10 bg-black/40 p-4 font-mono text-xs space-y-2 max-h-64 overflow-y-auto">
            <p className="text-white/30 text-[10px] tracking-widest mb-3">AGENT LOG</p>
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 slide-up">
                <span className="text-white/20 shrink-0">{String(i+1).padStart(2,'0')}</span>
                <span className="text-[#00d4ff]/80">{log}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}

        {result && !running && (
          <div className="mt-4 border border-[#00ff88]/30 bg-[#00ff88]/[0.02] p-4 slide-up">
            <p className="text-[#00ff88] text-xs tracking-widest mb-3">AGENT COMPLETE</p>
            <p className="text-white/50 text-xs mb-1">Best Buyer: <span className="text-white">{result.best_buyer?.business_name}</span></p>
            <p className="text-white/50 text-xs mb-4">Negotiation: <span className="text-[#00ff88] text-[10px]">{result.negotiation_id?.slice(0,16)}...</span></p>
            <button onClick={() => setScreen('negotiate')}
              className="w-full border border-[#00ff88]/50 text-[#00ff88] py-3 text-xs tracking-widest">
              START AI NEGOTIATION →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SCREEN 4: NEGOTIATION ──
function NegotiateScreen({ setScreen }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [session?.logs?.length]);

  const startLiveNegotiation = async () => {
    setLoading(true);
    setError('');
    setSession(null);

    try {
      const res = await fetch(`${API}/demo/negotiations/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to start demo negotiation');

      setSession(data.session);

      const source = new EventSource(`${API}/demo/negotiations/${data.session.id}/events`);
      source.addEventListener('snapshot', (event) => setSession(JSON.parse(event.data)));
      source.addEventListener('update', (event) => setSession(JSON.parse(event.data).session));
      source.addEventListener('ready', (event) => {
        setSession(JSON.parse(event.data));
        source.close();
      });
      source.onerror = () => source.close();
    } catch (e) {
      setError(e.message || 'Live negotiation failed');
    } finally {
      setLoading(false);
    }
  };

  const approveDeal = async () => {
    if (!session?.id || session.status === 'approved') return;

    setApproving(true);
    setError('');
    try {
      const res = await fetch(`${API}/demo/negotiations/${session.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ final_price: session.pricing?.ai_suggested })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approval failed');
      setSession(data.session);
    } catch (e) {
      setError(e.message || 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  const pricing = session?.pricing || {};
  const canApprove = session?.status === 'awaiting_approval';

  return (
    <div className="flex-1 pb-20 slide-up">
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {(loading || session?.status === 'running') && <div className="w-2 h-2 bg-[#00d4ff] rounded-full pulse-dot" />}
              <p className="text-[#00d4ff] text-xs tracking-widest">LIVE AI NEGOTIATION</p>
            </div>
            <p className="text-white/30 text-xs mt-1">Fair-price feed for jury demo</p>
          </div>
          <button onClick={startLiveNegotiation} disabled={loading}
            className="border border-[#00d4ff]/40 px-3 py-2 text-[10px] tracking-widest text-[#00d4ff] disabled:opacity-40">
            {loading ? 'STARTING' : 'RESTART'}
          </button>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {!session && (
          <div className="border border-[#00d4ff]/30 bg-[#00d4ff]/[0.04] p-5">
            <p className="text-white text-sm tracking-widest mb-2">DEMO DEAL ROOM</p>
            <p className="text-white/40 text-xs leading-relaxed mb-5">
              Start a live negotiation between a verified farmer and wholesale buyer. The feed streams agent decisions in real time and ends with your approval.
            </p>
            <button onClick={startLiveNegotiation} disabled={loading}
              className="w-full border border-[#00d4ff]/60 text-[#00d4ff] py-4 text-sm tracking-widest disabled:opacity-40">
              {loading ? 'CONNECTING AGENTS...' : 'START LIVE NEGOTIATION'}
            </button>
          </div>
        )}

        {error && (
          <div className="border border-[#ff6b6b]/40 bg-[#ff6b6b]/[0.04] p-3 text-[#ff6b6b] text-xs">
            {error}
          </div>
        )}

        {session && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-white/10 bg-white/[0.02] p-3">
                <p className="text-white/30 text-[10px] tracking-widest mb-1">FARMER</p>
                <p className="text-white text-sm">{session.farmer?.name}</p>
                <p className="text-[#00ff88] text-xs mt-1">Passport {session.farmer?.passport_score}</p>
              </div>
              <div className="border border-white/10 bg-white/[0.02] p-3">
                <p className="text-white/30 text-[10px] tracking-widest mb-1">BUYER</p>
                <p className="text-white text-sm">{session.buyer?.business_name}</p>
                <p className="text-[#00d4ff] text-xs mt-1">Trust {session.buyer?.passport_score}</p>
              </div>
            </div>

            <div className="border border-white/10 bg-white/[0.02] p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-white text-sm tracking-widest">{session.crop}</p>
                  <p className="text-white/30 text-xs">{session.quantity_kg}kg | {session.logistics?.pickup_window}</p>
                </div>
                <div className={`text-[10px] tracking-widest px-2 py-1 border ${session.status === 'approved' ? 'border-[#00ff88]/40 text-[#00ff88]' : 'border-[#ffaa00]/40 text-[#ffaa00]'}`}>
                  {session.status.replaceAll('_', ' ').toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border border-white/10 p-3">
                  <p className="text-white/30 text-[10px] mb-1">ASK</p>
                  <p className="text-white text-lg font-bold">Rs {pricing.farmer_expected}</p>
                </div>
                <div className="border border-white/10 p-3">
                  <p className="text-white/30 text-[10px] mb-1">BUYER</p>
                  <p className="text-white text-lg font-bold">{pricing.buyer_offered ? `Rs ${pricing.buyer_offered}` : '--'}</p>
                </div>
                <div className="border border-[#00d4ff]/30 bg-[#00d4ff]/[0.04] p-3">
                  <p className="text-[#00d4ff]/60 text-[10px] mb-1">AI FAIR</p>
                  <p className="text-[#00d4ff] text-lg font-bold">{pricing.ai_suggested ? `Rs ${pricing.ai_suggested}` : '--'}</p>
                </div>
              </div>

              <div className="mt-4 flex justify-between text-xs">
                <span className="text-white/30">Fairness Score</span>
                <span className="text-[#00ff88]">{pricing.fairness_score ? `${pricing.fairness_score}/100` : 'calculating'}</span>
              </div>
            </div>

            <div ref={feedRef} className="border border-white/10 bg-black/40 p-4 font-mono text-xs space-y-3 max-h-64 overflow-y-auto">
              <p className="text-white/30 text-[10px] tracking-widest">LIVE AGENT FEED</p>
              {(session.logs || []).length === 0 && <p className="text-white/25">Waiting for agents...</p>}
              {(session.logs || []).map((log, i) => (
                <div key={log.id || i} className="flex gap-2 slide-up">
                  <span className="text-white/20 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="text-[#00d4ff]">{log.agent}</p>
                    <p className="text-white/55 leading-relaxed">{log.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {session.status === 'approved' ? (
              <div className="border border-[#00ff88]/40 bg-[#00ff88]/[0.05] p-4 text-center">
                <p className="text-[#00ff88] text-sm tracking-widest mb-1">DEAL APPROVED</p>
                <p className="text-white/50 text-xs">Total value Rs {session.total_value?.toLocaleString()} | Passport scores updated</p>
              </div>
            ) : (
              <button onClick={approveDeal} disabled={!canApprove || approving}
                className="w-full border-2 border-[#00ff88] text-[#00ff88] py-5 text-sm tracking-widest disabled:opacity-30 hover:bg-[#00ff88]/10 transition-all">
                {approving ? 'APPROVING DEAL...' : canApprove ? 'APPROVE AND EXECUTE DEAL' : 'WAITING FOR AI RECOMMENDATION'}
              </button>
            )}

            <button onClick={() => setScreen('dashboard')}
              className="w-full border border-white/15 text-white/40 py-3 text-xs tracking-widest">
              BACK TO DASHBOARD
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LegacyNegotiateScreen({ setScreen }) {
  const [negId, setNegId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runNegotiation = async () => {
    if (!negId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/negotiations/negotiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negotiation_id: negId })
      });
      const data = await res.json();
      setResult(data);
      setLoading(false);
    } catch (e) { setLoading(false); }
  };

  return (
    <div className="flex-1 pb-20 slide-up">
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <p className="text-[#00d4ff] text-xs tracking-widest">AI NEGOTIATION</p>
        <p className="text-white/30 text-xs mt-1">Gemini Fair-Price Engine</p>
      </div>

      <div className="px-5 pt-5">
        {!result ? (
          <>
            <p className="text-white/30 text-[10px] tracking-widest mb-1">NEGOTIATION ID</p>
            <input
              placeholder="Paste negotiation ID"
              value={negId}
              onChange={e => setNegId(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 text-white text-xs px-4 py-3 outline-none focus:border-[#00d4ff]/50 placeholder-white/20 font-mono mb-4"
            />
            <button onClick={runNegotiation} disabled={loading || !negId}
              className="w-full border border-[#00d4ff]/50 text-[#00d4ff] py-4 text-sm tracking-widest disabled:opacity-30">
              {loading ? 'AI NEGOTIATING...' : 'RUN AI NEGOTIATION →'}
            </button>
          </>
        ) : (
          <div className="slide-up space-y-4">
            <p className="text-[#00d4ff] text-xs tracking-widest">{result.crop} • {result.quantity_kg}kg</p>

            {/* Price visualization */}
            <div className="border border-white/10 bg-white/[0.02] p-5">
              <div className="flex justify-between items-end mb-4">
                <div className="text-center">
                  <p className="text-white/30 text-[10px] mb-1">FARMER</p>
                  <p className="text-white text-xl font-bold">₹{result.pricing?.farmer_expected}</p>
                </div>
                <div className="text-center">
                  <div className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full pulse-dot mx-auto mb-1" />
                  <p className="text-[#00d4ff]/50 text-[10px]">AI</p>
                </div>
                <div className="text-center">
                  <p className="text-white/30 text-[10px] mb-1">BUYER</p>
                  <p className="text-white text-xl font-bold">₹{result.pricing?.buyer_offered}</p>
                </div>
              </div>

              {/* AI suggested price highlight */}
              <div className="border border-[#00d4ff]/30 bg-[#00d4ff]/[0.05] p-4 text-center">
                <p className="text-[#00d4ff]/50 text-[10px] tracking-widest mb-1">AI SUGGESTED FAIR PRICE</p>
                <p className="text-[#00d4ff] text-4xl font-bold">₹{result.pricing?.ai_suggested}</p>
                <p className="text-white/30 text-xs mt-1">Fairness Score: {result.pricing?.fairness_score}/100</p>
              </div>
            </div>

            {/* AI Reasoning */}
            <div className="border border-white/10 bg-white/[0.02] p-4">
              <p className="text-white/30 text-[10px] tracking-widest mb-2">AI REASONING</p>
              <p className="text-white/60 text-xs leading-relaxed">{result.ai_reasoning}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-[#00ff88]/20 bg-[#00ff88]/[0.02] p-3">
                <p className="text-[#00ff88] text-[10px] tracking-widest mb-1">FARMER BENEFIT</p>
                <p className="text-white/50 text-xs">{result.farmer_benefit}</p>
              </div>
              <div className="border border-[#00d4ff]/20 bg-[#00d4ff]/[0.02] p-3">
                <p className="text-[#00d4ff] text-[10px] tracking-widest mb-1">BUYER BENEFIT</p>
                <p className="text-white/50 text-xs">{result.buyer_benefit}</p>
              </div>
            </div>

            <button onClick={() => setScreen('approve')}
              className="w-full border border-[#00ff88]/50 text-[#00ff88] py-4 text-sm tracking-widest">
              PROCEED TO APPROVAL →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SCREEN 5: HUMAN APPROVAL ──
function ApproveScreen({ setScreen }) {
  const [negId, setNegId] = useState('');
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState(null);

  const decide = async (choice) => {
    if (!negId) return;
    setLoading(true);
    setDecision(choice);
    try {
      const res = await fetch(`${API}/approval/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negotiation_id: negId, decision: choice })
      });
      const data = await res.json();
      setLoading(false);
      if (choice === 'approve') setScreen('deal');
    } catch (e) { setLoading(false); }
  };

  return (
    <div className="flex-1 pb-20 slide-up">
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <p className="text-[#ffaa00] text-xs tracking-widest">HUMAN APPROVAL</p>
        <p className="text-white/30 text-xs mt-1">AI is assisted, not autonomous</p>
      </div>

      <div className="px-5 pt-5">
        <p className="text-white/30 text-[10px] tracking-widest mb-1">NEGOTIATION ID</p>
        <input
          placeholder="Paste negotiation ID"
          value={negId}
          onChange={e => setNegId(e.target.value)}
          className="w-full bg-white/[0.03] border border-white/10 text-white text-xs px-4 py-3 outline-none focus:border-white/30 placeholder-white/20 font-mono mb-6"
        />

        <p className="text-white/30 text-[10px] tracking-widest mb-4">YOUR DECISION</p>

        <div className="space-y-3">
          <button onClick={() => decide('approve')} disabled={loading || !negId}
            className="w-full border-2 border-[#00ff88] text-[#00ff88] py-5 text-sm tracking-widest disabled:opacity-30 hover:bg-[#00ff88]/10 transition-all">
            ✓ APPROVE DEAL
          </button>
          <button onClick={() => decide('reject')} disabled={loading || !negId}
            className="w-full border border-[#ff6b6b]/50 text-[#ff6b6b] py-4 text-sm tracking-widest disabled:opacity-30">
            ✕ REJECT
          </button>
        </div>

        <div className="mt-6 border border-white/5 bg-white/[0.02] p-4">
          <p className="text-white/20 text-[10px] tracking-widest mb-2">WHY HUMAN APPROVAL?</p>
          <p className="text-white/30 text-xs leading-relaxed">
            EcoNexus AI suggests fair prices but never executes deals autonomously.
            Farmers and admins retain full control over every transaction.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN 6: DEAL CONFIRMED ──
function DealScreen({ setScreen }) {
  return (
    <div className="flex-1 pb-20 flex flex-col items-center justify-center px-5 slide-up">
      <div className="w-24 h-24 border-2 border-[#00ff88] flex items-center justify-center mb-8 relative">
        <span className="text-[#00ff88] text-4xl">✓</span>
        <div className="absolute inset-0 border-2 border-[#00ff88]/20 scale-110" />
      </div>

      <p className="text-[#00ff88] text-xl tracking-widest mb-2">DEAL EXECUTED</p>
      <p className="text-white/30 text-xs tracking-widest mb-8">POWERED BY ECONEXUS AI</p>

      <div className="w-full border border-[#00ff88]/20 bg-[#00ff88]/[0.02] p-5 mb-8">
        <div className="space-y-3">
          {[
            { label: 'FARMER', value: 'Raju Kumar' },
            { label: 'BUYER', value: 'FreshMart Wholesale' },
            { label: 'AI NEGOTIATED', value: '₹26.8/kg' },
            { label: 'TOTAL VALUE', value: '₹13,400' },
            { label: 'PASSPORT UPDATED', value: 'Score +2' },
          ].map(r => (
            <div key={r.label} className="flex justify-between">
              <span className="text-white/30 text-xs tracking-widest">{r.label}</span>
              <span className="text-white text-xs">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setScreen('dashboard')}
        className="w-full border border-white/20 text-white/50 py-4 text-xs tracking-widest">
        ← BACK TO DASHBOARD
      </button>
    </div>
  );
}
