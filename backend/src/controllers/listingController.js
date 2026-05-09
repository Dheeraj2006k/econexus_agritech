const supabase = require('../db/supabase');

// POST /api/listings/create
const createListing = async (req, res) => {
  try {
    const {
      farmer_id,
      crop_name,
      crop_category,
      quantity_kg,
      quality_grade,
      expected_price_per_kg,
      is_organic,
      harvest_date,
      expiry_days,
      location_village,
      location_district,
      location_lat,
      location_lng,
      description
    } = req.body;

    // Basic validation
    if (!farmer_id || !crop_name || !quantity_kg || !expected_price_per_kg) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify farmer exists
    const { data: farmer, error: farmerError } = await supabase
      .from('farmers')
      .select('id, name')
      .eq('id', farmer_id)
      .single();

    if (farmerError || !farmer) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    // Check approval status from farmer_status table
    const { data: farmerStatus, error: statusError } = await supabase
      .from('farmer_status')
      .select('status')
      .eq('farmer_id', farmer_id)
      .single();

    if (statusError || !farmerStatus || farmerStatus.status !== 'approved') {
      return res.status(403).json({ error: 'Farmer not approved yet' });
    }

    // Calculate urgency score based on expiry days
    let urgency_score = 0;
    if (expiry_days <= 2) urgency_score = 100;
    else if (expiry_days <= 5) urgency_score = 80;
    else if (expiry_days <= 10) urgency_score = 50;
    else urgency_score = 20;

    // Create listing
    const { data: listing, error } = await supabase
      .from('listings')
      .insert([{
        farmer_id,
        crop_name,
        crop_category: crop_category || 'general',
        quantity_kg,
        quality_grade: quality_grade || 'A',
        expected_price_per_kg,
        is_organic: is_organic || false,
        harvest_date: harvest_date || null,
        expiry_days: expiry_days || 7,
        urgency_score,
        location_village: location_village || null,
        location_district: location_district || null,
        location_lat: location_lat || null,
        location_lng: location_lng || null,
        description: description || null,
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Crop listing created. AI Agent is now searching for buyers.',
      listing_id: listing.id,
      crop: listing.crop_name,
      quantity_kg: listing.quantity_kg,
      expected_price_per_kg: listing.expected_price_per_kg,
      urgency_score: listing.urgency_score,
      status: listing.status
    });

  } catch (err) {
    console.error('Listing creation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/listings/active
const getActiveListings = async (req, res) => {
  try {
    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .order('urgency_score', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      total: listings.length,
      listings
    });

  } catch (err) {
    console.error('Fetch listings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createListing, getActiveListings };
