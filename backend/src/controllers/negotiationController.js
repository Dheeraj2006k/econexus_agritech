const supabase = require('../db/supabase');
const { callAI } = require('../utils/aiClient');

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

    // Simulate buyer's initial offer (15-20% below farmer's price)
    const farmerPrice = parseFloat(negotiation.initial_farmer_price);
    const buyerOffer = parseFloat((farmerPrice * 0.82).toFixed(2));

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
          round_1: {
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

module.exports = { runNegotiation };
