const supabase = require('../db/supabase');

const getAllFarmers = async (req, res) => {
  try {
    const { data: farmers, error } = await supabase.from('farmers').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return res.status(200).json({ success: true, count: farmers.length, farmers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Something went wrong', error: error.message });
  }
};

const getFarmerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: farmer, error: farmerError } = await supabase.from('farmers').select('*').eq('id', id).single();
    if (farmerError || !farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });
    const { data: passport } = await supabase.from('passports').select('*').eq('farmer_id', id).single();
    const { data: listings } = await supabase.from('listings').select('*').eq('farmer_id', id).eq('status', 'active');
    return res.status(200).json({ success: true, farmer, passport, active_listings: listings || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Something went wrong', error: error.message });
  }
};

const registerFarmer = async (req, res) => {
  try {
    const { name, phone, village, district, state, language, land_area_acres } = req.body;
    const { data: existing } = await supabase.from('farmers').select('id').eq('phone', phone).single();
    if (existing) return res.status(400).json({ success: false, message: 'Farmer with this phone number already exists' });
    const { data: farmer, error: farmerError } = await supabase
      .from('farmers')
      .insert([{ name, phone, village, district, state, language: language || 'Telugu', land_area_acres }])
      .select()
      .single();
    if (farmerError) throw farmerError;
    await supabase.from('passports').insert([{ farmer_id: farmer.id, trust_score: 50, genuinity_score: 50, total_deals: 0, successful_deals: 0, quality_verified: false, organic_certified: false, certifications: [], delivery_reliability: 0 }]);
    return res.status(201).json({ success: true, message: `Welcome to EcoNexus, ${farmer.name}!`, farmer });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Something went wrong', error: error.message });
  }
};

module.exports = { registerFarmer, getFarmerProfile, getAllFarmers };
