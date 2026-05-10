const supabase = require('../db/supabase');

const getApprovalContext = async (req, res) => {
  try {
    const { negotiation_id } = req.params;

    if (!negotiation_id) {
      return res.status(400).json({ error: 'negotiation_id is required' });
    }

    const { data: negotiation, error: negError } = await supabase
      .from('negotiations')
      .select('*')
      .eq('id', negotiation_id)
      .single();

    if (negError || !negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    const [{ data: listing }, { data: farmer }, { data: buyer }, { data: farmerPassport }] = await Promise.all([
      supabase.from('listings').select('*').eq('id', negotiation.listing_id).single(),
      supabase.from('farmers').select('*').eq('id', negotiation.farmer_id).single(),
      supabase.from('buyers').select('*').eq('id', negotiation.buyer_id).single(),
      supabase.from('passports').select('*').eq('farmer_id', negotiation.farmer_id).single()
    ]);

    const farmerScore = farmerPassport?.trust_score || farmerPassport?.genuinity_score || 50;
    const buyerScore = buyer?.passport_score || 50;
    const farmerPrice = Number(negotiation.initial_farmer_price || listing?.expected_price_per_kg || 0);
    const buyerOffer = Number(negotiation.initial_buyer_offer || negotiation.current_offer || 0);
    const aiPrice = Number(negotiation.ai_suggested_price || negotiation.current_offer || farmerPrice);
    const priceGap = farmerPrice && buyerOffer ? Math.round(((farmerPrice - buyerOffer) / farmerPrice) * 100) : 0;
    const passportRank = Math.round((farmerScore * 0.45) + (buyerScore * 0.45) + ((listing?.urgency_score || 50) * 0.10));

    return res.status(200).json({
      success: true,
      negotiation,
      listing,
      farmer,
      buyer,
      passports: {
        farmer: {
          score: farmerScore,
          tier: farmerScore >= 85 ? 'Gold' : farmerScore >= 70 ? 'Silver' : 'Bronze',
          genuinity_score: farmerPassport?.genuinity_score || farmerScore,
          quality_verified: Boolean(farmerPassport?.quality_verified),
          organic_certified: Boolean(farmerPassport?.organic_certified),
          certifications: farmerPassport?.certifications || []
        },
        buyer: {
          score: buyerScore,
          tier: buyer?.passport_tier || (buyerScore >= 85 ? 'Gold' : buyerScore >= 70 ? 'Silver' : 'Bronze'),
          status: buyer?.status || 'active',
          business_type: buyer?.business_type,
          preferred_crops: buyer?.preferred_crops || []
        }
      },
      ai_rank: {
        score: Math.min(100, passportRank),
        recommendation: passportRank >= 75 && priceGap <= 25 ? 'approve' : 'review',
        reasons: [
          `Farmer passport ${farmerScore}/100`,
          `Buyer passport ${buyerScore}/100`,
          `Price gap ${Math.max(0, priceGap)}% before AI suggestion`,
          `AI suggested Rs ${aiPrice}/kg`
        ]
      }
    });
  } catch (err) {
    console.error('Approval context error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/approval/decide
const approvalDecision = async (req, res) => {
  try {
    const { negotiation_id, decision, override_price } = req.body;

    // decision can be: 'approve', 'reject', 'counter'
    if (!negotiation_id || !decision) {
      return res.status(400).json({ error: 'negotiation_id and decision are required' });
    }

    if (!['approve', 'reject', 'counter'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be approve, reject, or counter' });
    }

    if (decision === 'counter' && !override_price) {
      return res.status(400).json({ error: 'override_price is required for counter decision' });
    }

    // Fetch negotiation
    const { data: negotiation, error: negError } = await supabase
      .from('negotiations')
      .select('*')
      .eq('id', negotiation_id)
      .single();

    if (negError || !negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    // Fetch listing
    const { data: listing } = await supabase
      .from('listings')
      .select('*')
      .eq('id', negotiation.listing_id)
      .single();

    // Fetch farmer
    const { data: farmer } = await supabase
      .from('farmers')
      .select('*')
      .eq('id', negotiation.farmer_id)
      .single();

    // Fetch buyer
    const { data: buyer } = await supabase
      .from('buyers')
      .select('*')
      .eq('id', negotiation.buyer_id)
      .single();

    const finalPrice = decision === 'counter'
      ? parseFloat(override_price)
      : parseFloat(negotiation.ai_suggested_price);

    // Handle each decision
    if (decision === 'approve' || decision === 'counter') {

      // 1. Create deal
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert([{
          negotiation_id: negotiation_id,
          listing_id: listing.id,
          farmer_id: negotiation.farmer_id,
          buyer_id: negotiation.buyer_id,
          final_price_per_kg: finalPrice,
          final_quantity_kg: listing.quantity_kg,
          total_value: finalPrice * listing.quantity_kg,
          delivery_status: 'confirmed'
        }])
        .select()
        .single();

      if (dealError) throw dealError;

      // 2. Close the listing
      await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', listing.id);

      // 3. Update negotiation status
      await supabase
        .from('negotiations')
        .update({
          status: 'deal_closed',
          current_offer: finalPrice
        })
        .eq('id', negotiation_id);

      // 4. Update farmer passport score (+2 for successful deal)
      const { data: passport } = await supabase
        .from('passports')
        .select('trust_score')
        .eq('farmer_id', negotiation.farmer_id)
        .single();

      if (passport) {
        const newScore = Math.min(100, passport.trust_score + 2);
        await supabase
          .from('passports')
          .update({ trust_score: newScore })
          .eq('farmer_id', negotiation.farmer_id);
      }

      // 5. Update buyer passport score (+1 for completing deal)
      const newBuyerScore = Math.min(100, buyer.passport_score + 1);
      await supabase
        .from('buyers')
        .update({ passport_score: newBuyerScore })
        .eq('id', negotiation.buyer_id);

      return res.status(200).json({
        message: decision === 'approve'
          ? '✅ Deal approved and executed!'
          : '✅ Counter offer accepted. Deal executed!',
        deal_id: deal.id,
        crop: listing.crop_name,
        quantity_kg: listing.quantity_kg,
        farmer: farmer.name,
        buyer: buyer.business_name,
        final_price_per_kg: finalPrice,
        total_value: finalPrice * listing.quantity_kg,
        listing_status: 'sold',
        passport_updates: {
          farmer_score_increased: true,
          buyer_score_increased: true
        }
      });

    } else if (decision === 'reject') {

      // Reset negotiation to pending
      await supabase
        .from('negotiations')
        .update({ status: 'pending' })
        .eq('id', negotiation_id);

      return res.status(200).json({
        message: '❌ Deal rejected. Negotiation reset to pending.',
        negotiation_id,
        status: 'pending',
        next: 'Re-run negotiation or find new buyers'
      });
    }

  } catch (err) {
    console.error('Approval error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/approval/counter
const counterOffer = async (req, res) => {
  try {
    const { negotiation_id, counter_price, offered_by } = req.body;

    if (!negotiation_id || !counter_price || !offered_by) {
      return res.status(400).json({ error: 'negotiation_id, counter_price and offered_by required' });
    }

    if (!['farmer', 'buyer'].includes(offered_by)) {
      return res.status(400).json({ error: 'offered_by must be farmer or buyer' });
    }

    const { data: neg, error } = await supabase
      .from('negotiations')
      .select('*')
      .eq('id', negotiation_id)
      .single();

    if (error || !neg) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    const price = parseFloat(counter_price);
    const farmerPrice = parseFloat(neg.initial_farmer_price);
    const aiPrice = parseFloat(neg.ai_suggested_price || farmerPrice);

    if (price <= 0) {
      return res.status(400).json({ error: 'Counter price must be positive' });
    }

    const existingMessages = neg.messages || {};
    const round = (neg.round_number || 1) + 1;
    const roundKey = `round_${round}`;
    const updatedMessages = {
      ...existingMessages,
      [roundKey]: {
        offered_by,
        counter_price: price,
        previous_ai_suggestion: aiPrice,
        timestamp: new Date().toISOString()
      }
    };

    const { error: updateError } = await supabase
      .from('negotiations')
      .update({
        current_offer: price,
        round_number: round,
        status: 'negotiating',
        messages: updatedMessages,
        ...(offered_by === 'buyer' ? { initial_buyer_offer: price } : {})
      })
      .eq('id', negotiation_id);

    if (updateError) throw updateError;

    return res.status(200).json({
      message: `Counter offer submitted by ${offered_by}`,
      negotiation_id,
      offered_by,
      counter_price: price,
      round,
      status: 'negotiating',
      next: 'Run AI negotiation again to get updated fair price'
    });

  } catch (err) {
    console.error('Counter offer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { approvalDecision, getApprovalContext, counterOffer };
