'use client';

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { agentFetch, apiFetch, getAuth } from '@/lib/api';

const CROP_CATEGORIES = ['Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices', 'Other'];
const QUALITY_GRADES = ['A', 'B', 'C'];
const VOICE_LANGS = [
  { label: 'English', code: 'en-IN' },
  { label: 'Telugu', code: 'te-IN' },
  { label: 'Hindi', code: 'hi-IN' },
];

type AuthUser = {
  id: string;
  role: string;
};

type AuthSession = {
  token: string;
  user: AuthUser;
};

type FormState = {
  crop_name: string;
  crop_category: string;
  quantity_kg: string;
  expected_price_per_kg: string;
  quality_grade: string;
  is_organic: boolean;
  harvest_date: string;
  description: string;
};

type VoiceField = Exclude<keyof FormState, 'is_organic' | 'crop_category' | 'quality_grade' | 'harvest_date'>;

type SpeechRecognitionResultEventLike = {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & typeof globalThis & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const normalizeVoiceValue = (fieldName: VoiceField, transcript: string) => {
  if (fieldName !== 'quantity_kg' && fieldName !== 'expected_price_per_kg') {
    return transcript;
  }

  const numericMatch = transcript.replace(/,/g, '').match(/\d+(\.\d+)?/);
  return numericMatch?.[0] || '';
};

function MicButton({
  field,
  activeField,
  onStart,
}: {
  field: VoiceField;
  activeField: VoiceField | null;
  onStart: (field: VoiceField) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onStart(field)}
      title="Click to speak"
      aria-label={`Speak ${field.replace(/_/g, ' ')}`}
      className={`absolute right-3 top-1/2 -translate-y-1/2 text-lg transition-all ${
        activeField === field ? 'text-red-400 animate-pulse' : 'text-zinc-500 hover:text-emerald-400'
      }`}
    >
      {activeField === field ? '🔴' : '🎤'}
    </button>
  );
}

export default function NewListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voiceLang, setVoiceLang] = useState('en-IN');
  const [listening, setListening] = useState(false);
  const [activeField, setActiveField] = useState<VoiceField | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const [form, setForm] = useState<FormState>({
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
    const auth = getAuth() as AuthSession | null;
    if (!auth) {
      router.push('/login');
      return;
    }
    if (auth.user.role !== 'farmer') {
      router.push('/dashboard');
    }
  }, [router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const value = target instanceof HTMLInputElement && target.type === 'checkbox'
      ? target.checked
      : target.value;

    setForm(prev => ({ ...prev, [target.name]: value }));
  };

  const startVoice = (fieldName: VoiceField) => {
    const speechWindow = window as SpeechWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Please use Chrome.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setActiveField(null);
      return;
    }

    setError('');
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setListening(true);
      setActiveField(fieldName);
    };

    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript.trim();
      const value = normalizeVoiceValue(fieldName, transcript);
      setForm(prev => ({ ...prev, [fieldName]: value }));
    };

    recognition.onend = () => {
      setListening(false);
      setActiveField(null);
    };

    recognition.onerror = () => {
      setListening(false);
      setActiveField(null);
      setError('Voice input failed. Please try again or type the value.');
    };

    recognition.start();
  };

  const runPipelineInBackground = (farmerId: string, listingId: string) => {
    void (async () => {
      try {
        const agentResult = await agentFetch('/farmer/run', {
          method: 'POST',
          body: JSON.stringify({ farmer_id: farmerId, listing_id: listingId }),
        });

        let negotiationId = agentResult.negotiation_id || null;
        if (!negotiationId) {
          const matchingResult = await apiFetch('/matching/find-buyers', {
            method: 'POST',
            body: JSON.stringify({ listing_id: listingId }),
          });
          negotiationId = matchingResult.negotiation_id || null;
        }

        if (!negotiationId) return;

        await agentFetch('/super/run', {
          method: 'POST',
          body: JSON.stringify({ region: 'Telangana' }),
        });

        await apiFetch('/negotiations/negotiate', {
          method: 'POST',
          body: JSON.stringify({ negotiation_id: negotiationId }),
        });
      } catch (err) {
        console.error('Background pipeline error:', err);
      }
    })();
  };

  const handleSubmit = async () => {
    setError('');
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
        const listingId = res.listing_id || res.id || res.listing?.id;
        if (!listingId) {
          setError('Listing created, but the server did not return a listing id.');
          setLoading(false);
          return;
        }

        runPipelineInBackground(auth.user.id, listingId);
        router.push('/dashboard');
      } else {
        setError(res.message || res.error || 'Failed to create listing.');
        setLoading(false);
      }
    } catch {
      setError('Network error. Is the backend running?');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-zinc-400 hover:text-emerald-400 text-sm mb-4 flex items-center gap-1"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-white">Post Crop Listing</h1>
          <p className="text-zinc-400 mt-1">AI will find the best buyers for your crop</p>
        </div>

        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-zinc-400 text-sm">🎤 Voice Language:</span>
          <div className="flex gap-2">
            {VOICE_LANGS.map(lang => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setVoiceLang(lang.code)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  voiceLang === lang.code
                    ? 'bg-emerald-500 text-black'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {listening && (
          <div className="mb-3 bg-red-900/30 border border-red-500 rounded-xl px-4 py-2 text-red-400 text-sm animate-pulse">
            🔴 Listening in {VOICE_LANGS.find(lang => lang.code === voiceLang)?.label}... Speak now
          </div>
        )}

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-5">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Crop Name *</label>
            <div className="relative">
              <input
                name="crop_name"
                value={form.crop_name}
                onChange={handleChange}
                placeholder="e.g. Fresh Tomatoes"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 pr-10 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
              <MicButton field="crop_name" activeField={activeField} onStart={startVoice} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Category *</label>
            <select
              name="crop_category"
              value={form.crop_category}
              onChange={handleChange}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            >
              {CROP_CATEGORIES.map(category => <option key={category}>{category}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Quantity (kg) *</label>
              <div className="relative">
                <input
                  name="quantity_kg"
                  value={form.quantity_kg}
                  onChange={handleChange}
                  type="number"
                  placeholder="e.g. 500"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 pr-10 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
                <MicButton field="quantity_kg" activeField={activeField} onStart={startVoice} />
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Price per kg (₹) *</label>
              <div className="relative">
                <input
                  name="expected_price_per_kg"
                  value={form.expected_price_per_kg}
                  onChange={handleChange}
                  type="number"
                  placeholder="e.g. 30"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 pr-10 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
                <MicButton field="expected_price_per_kg" activeField={activeField} onStart={startVoice} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Quality Grade *</label>
              <select
                name="quality_grade"
                value={form.quality_grade}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              >
                {QUALITY_GRADES.map(grade => <option key={grade} value={grade}>Grade {grade}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                name="is_organic"
                type="checkbox"
                checked={form.is_organic}
                onChange={handleChange}
                className="w-5 h-5 accent-emerald-500"
              />
              <label className="text-sm text-zinc-300">Organic Certified</label>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Harvest Date *</label>
            <input
              name="harvest_date"
              value={form.harvest_date}
              onChange={handleChange}
              type="date"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Description</label>
            <div className="relative">
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Any extra details about your crop..."
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 pr-10 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
              <button
                type="button"
                onClick={() => startVoice('description')}
                aria-label="Speak description"
                className={`absolute right-3 top-3 text-lg transition-all ${
                  activeField === 'description' ? 'text-red-400 animate-pulse' : 'text-zinc-500 hover:text-emerald-400'
                }`}
              >
                {activeField === 'description' ? '🔴' : '🎤'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold py-4 rounded-xl transition-all text-lg"
          >
            {loading ? 'Creating listing...' : '🌾 Post Listing'}
          </button>
        </div>

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
