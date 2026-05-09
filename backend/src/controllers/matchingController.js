const supabase = require('../db/supabase');

// POST /api/matching/find-buyers
const findMatchingBuyers = async (req, res) => {
  try {
    const { listing_id } = req.body;

    if (!listing_id) {
      return res.status(400).json({ error: 'listing_id is required' });
    }

    // Fetch the listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Prepare search terms from crop name and category
    const searchTerms = [
      listing.crop_name.toLowerCase(),
      listing.crop_category.toLowerCase(),
      // Also try individual words e.g. "Fresh Tomatoes" → "tomatoes"
      ...listing.crop_name.toLowerCase().split(' ')
    ];

    // Fetch all active buyers with their preferred crops
    const { data: buyers, error: buyerError } = await supabase
      .from('buyers')
      .select('id, name, business_name, business_type, city, state, preferred_crops, passport_score, passport_tier')
      .eq('status', 'active');

    if (buyerError) throw buyerError;

    // Match buyers whose preferred_crops overlap with search terms
    const matchedBuyers = buyers
      .filter(buyer => {
        if (!buyer.preferred_crops || buyer.preferred_crops.length === 0) return false;
        const buyerCrops = buyer.preferred_crops.map(c => c.toLowerCase());
        return searchTerms.some(term => buyerCrops.some(crop => crop.includes(term) || term.includes(crop)));
      })
      .map(buyer => ({
        ...buyer,
        match_score: calculateMatchScore(buyer, listing)
      }))
      .sort((a, b) => b.match_score - a.match_score);

    // Save matches to negotiations table as pending
    if (matchedBuyers.length > 0) {
      const topBuyer = matchedBuyers[0];

      const { error: negotiationError } = await supabase
        .from('negotiations')
        .insert([{
          listing_id: listing.id,
          farmer_id: listing.farmer_id,
          buyer_id: topBuyer.id,
          initial_farmer_price: listing.expected_price_per_kg,
          status: 'pending'
        }]);

      if (negotiationError) throw negotiationError;
    }

    return res.status(200).json({
      message: `Found ${matchedBuyers.length} matching buyer(s) for ${listing.crop_name}`,
      listing: {
        id: listing.id,
        crop: listing.crop_name,
        quantity_kg: listing.quantity_kg,
        expected_price_per_kg: listing.expected_price_per_kg,
        urgency_score: listing.urgency_score
      },
      matched_buyers: matchedBuyers,
      top_match: matchedBuyers[0] || null,
      negotiation_initiated: matchedBuyers.length > 0
    });

  } catch (err) {
    console.error('Matching error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Score calculation logic
function calculateMatchScore(buyer, listing) {
  let score = 0;

  // Passport trust score (max 50 points)
  score += (buyer.passport_score / 100) * 50;

  // Tier bonus
  if (buyer.passport_tier === 'Platinum') score += 20;
  else if (buyer.passport_tier === 'Gold') score += 15;
  else if (buyer.passport_tier === 'Silver') score += 10;

  // Location bonus — same state (max 20 points)
  if (buyer.state && listing.location_district) {
    score += 10; // simplified — full geo matching comes in Phase 2
  }

  // Urgency alignment — wholesalers preferred for urgent listings
  if (listing.urgency_score >= 80 && buyer.business_type === 'wholesaler') {
    score += 20;
  }

  return Math.round(score);
}

module.exports = { findMatchingBuyers };