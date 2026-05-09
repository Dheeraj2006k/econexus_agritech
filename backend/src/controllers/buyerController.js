const supabase = require('../db/supabase');
const bcrypt = require('bcryptjs');

// POST /api/buyers/register
const registerBuyer = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      business_name,
      business_type,
      city,
      state,
      preferred_crops
    } = req.body;

    // Basic validation
    if (!name || !phone || !email || !password || !business_name || !business_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('buyers')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Calculate initial passport tier
    const passport_score = 50;
    const passport_tier = 'Silver';

    // Insert buyer
    const { data: buyer, error } = await supabase
      .from('buyers')
      .insert([{
        name,
        phone,
        email,
        password_hash,
        business_name,
        business_type,
        city: city || null,
        state: state || null,
        preferred_crops: preferred_crops || [],
        passport_score,
        passport_tier,
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Buyer registered successfully. Digital Passport created.',
      buyer_id: buyer.id,
      name: buyer.name,
      business_name: buyer.business_name,
      passport: {
        score: buyer.passport_score,
        tier: buyer.passport_tier,
        status: buyer.status
      }
    });

  } catch (err) {
    console.error('Buyer registration error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { registerBuyer };