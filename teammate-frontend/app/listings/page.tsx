'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BadgeIndianRupee, Leaf, MapPin, Send, ShoppingBasket } from 'lucide-react';
import { apiFetch, getAuth } from '@/lib/api';

type AuthUser = {
  id: string;
  role: string;
};

type AuthSession = {
  token: string;
  user: AuthUser;
};

type Listing = {
  id: string;
  farmer_id: string;
  crop_name: string;
  crop_category: string;
  quantity_kg: number;
  quality_grade: string;
  expected_price_per_kg: number;
  is_organic: boolean;
  harvest_date: string;
  expiry_days: number;
  urgency_score: number;
  location_village?: string;
  location_district?: string;
  description?: string;
  created_at: string;
};

type OfferState = Record<string, string>;

export default function ListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<OfferState>({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const session = getAuth() as AuthSession | null;
    if (!session) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    const loadListings = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch('/listings/active');
        setListings(data.listings || []);
      } catch {
        setError('Could not load active listings.');
      } finally {
        setLoading(false);
      }
    };

    loadListings();
  }, []);

  const submitOffer = async (listing: Listing) => {
    const session = getAuth() as AuthSession | null;
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'buyer') {
      setError('Only buyers can make offers on listings.');
      return;
    }

    const offerPrice = Number(offers[listing.id]);
    if (!Number.isFinite(offerPrice) || offerPrice <= 0) {
      setError('Enter a valid offer price per kg.');
      return;
    }

    setSubmittingId(listing.id);
    setError('');
    setMessage('');

    try {
      const offerResult = await apiFetch('/negotiations/offer', {
        method: 'POST',
        body: JSON.stringify({
          listing_id: listing.id,
          buyer_id: session.user.id,
          offer_price: offerPrice,
        }),
      });

      if (offerResult.error || !offerResult.negotiation_id) {
        throw new Error(offerResult.error || 'Could not create negotiation.');
      }

      const negotiationResult = await apiFetch('/negotiations/negotiate', {
        method: 'POST',
        body: JSON.stringify({ negotiation_id: offerResult.negotiation_id }),
      });

      if (negotiationResult.error) {
        throw new Error(negotiationResult.error);
      }

      setMessage('Offer submitted. AI negotiation started.');
      router.push('/negotiations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Offer failed. Please try again.');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-zinc-400 hover:text-emerald-400 text-sm mb-4 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold">Browse Crop Listings</h1>
            <p className="text-zinc-400 mt-1">Make an offer and let AI negotiate a fair price.</p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <ShoppingBasket className="w-4 h-4 text-emerald-400" />
            {listings.length} active listings
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-500 rounded-xl px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 bg-emerald-900/30 border border-emerald-500 rounded-xl px-4 py-3 text-emerald-300 text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-400">
            Loading active listings...
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-400">
            No active crop listings right now.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">{listing.crop_category}</p>
                    <h2 className="text-xl font-bold mt-1">{listing.crop_name}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Grade</p>
                    <p className="font-bold text-emerald-300">{listing.quality_grade}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3">
                    <p className="text-zinc-500">Quantity</p>
                    <p className="font-semibold">{listing.quantity_kg} kg</p>
                  </div>
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3">
                    <p className="text-zinc-500">Farmer Ask</p>
                    <p className="font-semibold">₹{listing.expected_price_per_kg}/kg</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-zinc-400">
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    {[listing.location_village, listing.location_district].filter(Boolean).join(', ') || 'Location pending'}
                  </p>
                  {listing.is_organic && (
                    <p className="flex items-center gap-2 text-emerald-300">
                      <Leaf className="w-4 h-4" />
                      Organic certified
                    </p>
                  )}
                  {listing.description && <p className="line-clamp-2">{listing.description}</p>}
                </div>

                <div className="mt-auto space-y-3">
                  <label className="block text-sm text-zinc-400">Your offer per kg</label>
                  <div className="relative">
                    <BadgeIndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="number"
                      min="1"
                      value={offers[listing.id] || ''}
                      onChange={(event) => setOffers(prev => ({ ...prev, [listing.id]: event.target.value }))}
                      placeholder={`e.g. ${Math.round(listing.expected_price_per_kg * 0.9)}`}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    onClick={() => submitOffer(listing)}
                    disabled={submittingId === listing.id}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {submittingId === listing.id ? 'Starting AI negotiation...' : 'Make Offer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
