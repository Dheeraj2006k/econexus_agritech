const supabase = require('../db/supabase');

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

module.exports = { approvalDecision };