'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { agentFetch, apiFetch, getAuth } from '@/lib/api';

const CROP_CATEGORIES = ['Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices', 'Other'];
const QUALITY_GRADES = ['A', 'B', 'C'];

type AuthUser = {
  id: string;
  role: string;
};

type AuthSession = {
  token: string;
  user: AuthUser;
};

type PipelineStep = {
  label: string;
  status: 'pending' | 'running' | 'done' | 'skipped' | 'error';
};

const INITIAL_PIPELINE_STEPS: PipelineStep[] = [
  { label: 'Create crop listing', status: 'pending' },
  { label: 'Run farmer agent', status: 'pending' },
  { label: 'Find matching buyer', status: 'pending' },
  { label: 'Coordinate super agent', status: 'pending' },
  { label: 'Start AI negotiation', status: 'pending' },
];

export default function NewListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [pipelineSteps, setPipelineSteps] = useState(INITIAL_PIPELINE_STEPS);
  const [pipelineMessage, setPipelineMessage] = useState('');

  const [form, setForm] = useState({
    crop_name: '',
    crop_category: 'Vegetables',
    quantity_kg: '',
    expected_price_per_kg: '',
    quality_grade: 'A',
    is_organic: false,
    harvest_date: '',
    description: '',
  });

  useEffect(() => {
    const a = getAuth() as AuthSession | null;
    if (!a) { router.push('/login'); return; }
    if (a.user.role !== 'farmer') { router.push('/dashboard'); return; }
  }, [router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const value = target instanceof HTMLInputElement && target.type === 'checkbox'
      ? target.checked
      : target.value;

    setForm(prev => ({ ...prev, [target.name]: value }));
  };

  const updatePipelineStep = (index: number, status: PipelineStep['status']) => {
    setPipelineSteps(prev => prev.map((step, i) => i === index ? { ...step, status } : step));
  };

  const runListingPipeline = async (farmerId: string, listingId: string) => {
    let negotiationId: string | null = null;

    updatePipelineStep(1, 'running');
    const agentResult = await agentFetch('/farmer/run', {
      method: 'POST',
      body: JSON.stringify({ farmer_id: farmerId, listing_id: listingId }),
    });

    if (agentResult.error) {
      updatePipelineStep(1, 'error');
      throw new Error(agentResult.error);
    }

    updatePipelineStep(1, 'done');
    negotiationId = agentResult.negotiation_id || null;

    if (negotiationId) {
      updatePipelineStep(2, 'done');
    } else {
      updatePipelineStep(2, 'running');
      const matchingResult = await apiFetch('/matching/find-buyers', {
        method: 'POST',
        body: JSON.stringify({ listing_id: listingId }),
      });

      if (matchingResult.error) {
        updatePipelineStep(2, 'error');
        throw new Error(matchingResult.error);
      }

      updatePipelineStep(2, matchingResult.negotiation_initiated ? 'done' : 'skipped');
      negotiationId = matchingResult.negotiation_id || null;
    }

    if (!negotiationId) {
      updatePipelineStep(3, 'skipped');
      updatePipelineStep(4, 'skipped');
      setPipelineMessage('Listing is live. No matching buyer was found yet, so negotiation will start after a buyer match appears.');
      return;
    }

    updatePipelineStep(3, 'running');
    const superAgentResult = await agentFetch('/super/run', {
      method: 'POST',
      body: JSON.stringify({ region: 'Telangana' }),
    });

    if (superAgentResult.error) {
      updatePipelineStep(3, 'error');
      throw new Error(superAgentResult.error);
    }

    updatePipelineStep(3, 'done');

    updatePipelineStep(4, 'running');
    const negotiationResult = await apiFetch('/negotiations/negotiate', {
      method: 'POST',
      body: JSON.stringify({ negotiation_id: negotiationId }),
    });

    if (negotiationResult.error) {
      updatePipelineStep(4, 'error');
      throw new Error(negotiationResult.error);
    }

    updatePipelineStep(4, 'done');
    setPipelineMessage('Listing is live, a buyer match was found, and AI negotiation has started.');
  };

  const handleSubmit = async () => {
    setError('');
    setPipelineMessage('');
    setPipelineSteps(INITIAL_PIPELINE_STEPS);
    if (!form.crop_name || !form.quantity_kg || !form.expected_price_per_kg || !form.harvest_date) {
      setError('Please fill all required fields.');
      return;
    }
    setLoading(true);
    try {
      const auth = getAuth() as AuthSession | null;
      if (!auth) {
        router.push('/login');
        return;
      }

      updatePipelineStep(0, 'running');
      const res = await apiFetch('/listings/create', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          quantity_kg: Number(form.quantity_kg),
          expected_price_per_kg: Number(form.expected_price_per_kg),
          farmer_id: auth.user.id,
        }),
      });
      if (res.listing || res.listing_id || res.id || res.success) {
        updatePipelineStep(0, 'done');
        const listingId = res.listing_id || res.id || res.listing?.id;
        await runListingPipeline(auth.user.id, listingId);
        setSuccess(true);
        setTimeout(() => router.push('/dashboard'), 2500);
      } else {
        updatePipelineStep(0, 'error');
        setError(res.message || res.error || 'Failed to create listing.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pipeline failed. Please check the backend and agent servers.');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="bg-zinc-900 rounded-2xl p-10 text-center border border-emerald-500">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-emerald-400 mb-2">Agent Pipeline Started!</h2>
        <p className="text-zinc-400">{pipelineMessage || 'Redirecting to dashboard...'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 py-10">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.push('/dashboard')}
            className="text-zinc-400 hover:text-emerald-400 text-sm mb-4 flex items-center gap-1">
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-white">Post Crop Listing</h1>
          <p className="text-zinc-400 mt-1">AI will find the best buyers for your crop</p>
        </div>

        {/* Form */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-5">

          {/* Crop Name */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Crop Name *</label>
            <input name="crop_name" value={form.crop_name} onChange={handleChange}
              placeholder="e.g. Fresh Tomatoes"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Category *</label>
            <select name="crop_category" value={form.crop_category} onChange={handleChange}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500">
              {CROP_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Quantity + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Quantity (kg) *</label>
              <input name="quantity_kg" value={form.quantity_kg} onChange={handleChange}
                type="number" placeholder="e.g. 500"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Price per kg (₹) *</label>
              <input name="expected_price_per_kg" value={form.expected_price_per_kg} onChange={handleChange}
                type="number" placeholder="e.g. 30"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          {/* Quality + Organic */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Quality Grade *</label>
              <select name="quality_grade" value={form.quality_grade} onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500">
                {QUALITY_GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input name="is_organic" type="checkbox" checked={form.is_organic} onChange={handleChange}
                className="w-5 h-5 accent-emerald-500" />
              <label className="text-sm text-zinc-300">Organic Certified</label>
            </div>
          </div>

          {/* Harvest Date */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Harvest Date *</label>
            <input name="harvest_date" value={form.harvest_date} onChange={handleChange}
              type="date"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              placeholder="Any extra details about your crop..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none" />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-500 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 space-y-2">
              {pipelineSteps.map(step => (
                <div key={step.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-300">{step.label}</span>
                  <span className={
                    step.status === 'done' ? 'text-emerald-400' :
                    step.status === 'running' ? 'text-sky-400' :
                    step.status === 'error' ? 'text-red-400' :
                    step.status === 'skipped' ? 'text-amber-300' :
                    'text-zinc-500'
                  }>
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold py-4 rounded-xl transition-all text-lg">
            {loading ? 'Posting...' : '🌾 Post Listing'}
          </button>
        </div>

        {/* Info box */}
        <div className="mt-4 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 text-sm text-zinc-400">
          <p className="text-emerald-400 font-semibold mb-1">What happens next?</p>
          <p>1. AI agents scan for matching buyers instantly</p>
          <p>2. Gemini AI negotiates the best price for you</p>
          <p>3. You review and approve the final deal</p>
        </div>

      </div>
    </div>
  );
}
