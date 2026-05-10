const supabase = require('../db/supabase');
const { callAI } = require('../utils/aiClient');

// POST /api/negotiations/offer
const createBuyerOffer = async (req, res) => {
  try {
    const { listing_id, buyer_id, offer_price } = req.body;

    if (!listing_id || !buyer_id || !offer_price) {
      return res.status(400).json({ error: 'listing_id, buyer_id and offer_price are required' });
    }

    const price = parseFloat(offer_price);
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: 'Offer price must be a positive number' });
    }

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .eq('status', 'active')
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Active listing not found' });
    }

    const { data: buyer, error: buyerError } = await supabase
      .from('buyers')
      .select('id, business_name, status')
      .eq('id', buyer_id)
      .eq('status', 'active')
      .single();

    if (buyerError || !buyer) {
      return res.status(404).json({ error: 'Active buyer not found' });
    }

    const { data: negotiation, error } = await supabase
      .from('negotiations')
      .insert([{
        listing_id: listing.id,
        farmer_id: listing.farmer_id,
        buyer_id: buyer.id,
        initial_farmer_price: listing.expected_price_per_kg,
        initial_buyer_offer: price,
        current_offer: price,
        round_number: 1,
        status: 'buyer_offered',
        messages: {
          round_1: {
            role: 'buyer_agent',
            content: `${buyer.business_name} offered ₹${price}/kg for ${listing.crop_name}.`,
            buyer_offer: price,
            timestamp: new Date().toISOString()
          }
        }
      }])
      .select('id')
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Buyer offer submitted. AI negotiation can now begin.',
      negotiation_id: negotiation.id,
      listing_id: listing.id,
      buyer_id: buyer.id,
      offer_price: price,
      status: 'buyer_offered'
    });

  } catch (err) {
    console.error('Buyer offer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/negotiations/negotiate
const runNegotiation = async (req, res) => {
  try {
    const { negotiation_id } = req.body;

    if (!negotiation_id) {
      return res.status(400).json({ error: 'negotiation_id is required' });
    }

    // Fetch negotiation with listing and buyer details
    const { data: negotiation, error: negError } = await supabase
      .from('negotiations')
      .select('*')
      .eq('id', negotiation_id)
      .single();

    if (negError || !negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    // Fetch listing details
    const { data: listing } = await supabase
      .from('listings')
      .select('*')
      .eq('id', negotiation.listing_id)
      .single();

    // Fetch buyer details
    const { data: buyer } = await supabase
      .from('buyers')
      .select('*')
      .eq('id', negotiation.buyer_id)
      .single();

    // Fetch farmer details
    const { data: farmer } = await supabase
      .from('farmers')
      .select('*')
      .eq('id', negotiation.farmer_id)
      .single();

    const farmerPrice = parseFloat(negotiation.initial_farmer_price);
    const buyerOffer = parseFloat(Number(negotiation.initial_buyer_offer || farmerPrice * 0.82).toFixed(2));

    // Build AI prompt
    const prompt = `
You are AgriMesh AI — a fair-price negotiation agent for agricultural supply chains in India.

NEGOTIATION CONTEXT:
- Crop: ${listing.crop_name} (${listing.crop_category})
- Quality Grade: ${listing.quality_grade}
- Quantity: ${listing.quantity_kg} kg
- Is Organic: ${listing.is_organic}
- Harvest Date: ${listing.harvest_date}
- Expiry Days Remaining: ${listing.expiry_days}
- Urgency Score: ${listing.urgency_score}/100
- Location: ${listing.location_village}, ${listing.location_district}

FARMER:
- Name: ${farmer.name}
- Expected Price: ₹${farmerPrice}/kg
- Passport Score: (verified farmer)

BUYER:
- Business: ${buyer.business_name} (${buyer.business_type})
- Location: ${buyer.city}, ${buyer.state}
- Buyer Offer: ₹${buyerOffer}/kg
- Passport Score: ${buyer.passport_score}/100

YOUR TASK:
1. Analyze the gap between farmer price (₹${farmerPrice}) and buyer offer (₹${buyerOffer})
2. Suggest a FAIR price that benefits both parties
3. Give clear reasoning in 2-3 sentences
4. Rate the deal fairness out of 100

Respond ONLY in this exact JSON format, no extra text:
{
  "suggested_price": <number>,
  "fairness_score": <number>,
  "reasoning": "<2-3 sentence explanation>",
  "recommendation": "accept" or "negotiate_further",
  "farmer_benefit": "<one line>",
  "buyer_benefit": "<one line>"
}
    `;

    // Call AI (Claude with OpenAI fallback)
    const rawText = await callAI(prompt);
    let aiResult;
    try {
      aiResult = JSON.parse(rawText);
    } catch {
      // Strip markdown fences if present
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      aiResult = JSON.parse(cleaned);
    }

    // Update negotiation in DB
    const { error: updateError } = await supabase
      .from('negotiations')
      .update({
        initial_buyer_offer: buyerOffer,
        ai_suggested_price: aiResult.suggested_price,
        current_offer: aiResult.suggested_price,
        round_number: 1,
        status: aiResult.recommendation === 'accept' ? 'ai_suggested' : 'negotiating',
        messages: {
          ...(negotiation.messages || {}),
          round_1: {
            ...(negotiation.messages?.round_1 || {}),
            farmer_price: farmerPrice,
            buyer_offer: buyerOffer,
            ai_suggestion: aiResult.suggested_price,
            reasoning: aiResult.reasoning,
            timestamp: new Date().toISOString()
          }
        }
      })
      .eq('id', negotiation_id);

    if (updateError) throw updateError;

    return res.status(200).json({
      message: 'AI Negotiation complete. Awaiting human approval.',
      negotiation_id,
      crop: listing.crop_name,
      quantity_kg: listing.quantity_kg,
      farmer: farmer.name,
      buyer: buyer.business_name,
      pricing: {
        farmer_expected: farmerPrice,
        buyer_offered: buyerOffer,
        ai_suggested: aiResult.suggested_price,
        fairness_score: aiResult.fairness_score
      },
      ai_reasoning: aiResult.reasoning,
      farmer_benefit: aiResult.farmer_benefit,
      buyer_benefit: aiResult.buyer_benefit,
      recommendation: aiResult.recommendation,
      status: 'awaiting_human_approval'
    });

  } catch (err) {
    console.error('Negotiation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/negotiations/:id/status
const getNegotiationStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: neg, error } = await supabase
      .from('negotiations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !neg) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    const { data: listing } = await supabase
      .from('listings')
      .select('crop_name, quantity_kg, urgency_score')
      .eq('id', neg.listing_id)
      .single();

    const { data: farmer } = await supabase
      .from('farmers')
      .select('id, name')
      .eq('id', neg.farmer_id)
      .single();

    const { data: buyer } = await supabase
      .from('buyers')
      .select('id, name, business_name, passport_score, passport_tier')
      .eq('id', neg.buyer_id)
      .single();

    return res.status(200).json({
      negotiation_id: neg.id,
      status: neg.status,
      round: neg.round_number || 0,
      crop: listing?.crop_name,
      quantity_kg: listing?.quantity_kg,
      urgency_score: listing?.urgency_score,
      farmer: {
        id: farmer?.id,
        name: farmer?.name,
        expected_price: neg.initial_farmer_price
      },
      buyer: {
        id: buyer?.id,
        name: buyer?.name,
        business_name: buyer?.business_name,
        passport_score: buyer?.passport_score,
        passport_tier: buyer?.passport_tier,
        offer: neg.initial_buyer_offer
      },
      pricing: {
        farmer_expected: neg.initial_farmer_price,
        buyer_offered: neg.initial_buyer_offer,
        ai_suggested: neg.ai_suggested_price,
        current: neg.current_offer
      },
      messages: neg.messages,
      created_at: neg.created_at,
      updated_at: neg.updated_at
    });

  } catch (err) {
    console.error('Negotiation status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createBuyerOffer, runNegotiation, getNegotiationStatus };
