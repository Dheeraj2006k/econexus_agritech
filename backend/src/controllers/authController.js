const supabase = require('../db/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'econexus_secret_2026';
const APPROVED_FARMER_STATUSES = new Set(['approved', 'active']);

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password and role are required' });
    }

    if (!['admin', 'farmer', 'buyer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin, farmer or buyer' });
    }

    let user = null;
    let userId = null;
    let userName = null;
    let passportScore = null;
    let passportTier = null;

    if (role === 'admin') {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, data.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      user = data;
      userId = data.id;
      userName = data.name || 'Admin';

    } else if (role === 'farmer') {
      // Farmers log in with phone number as email field
      const { data, error } = await supabase
        .from('farmers')
        .select('*')
        .eq('phone', email)
        .single();

      if (error || !data) {
        return res.status(401).json({ error: 'Farmer not found' });
      }

      // Farmers use phone as password too for simplicity
      // Check farmer_status
      const { data: statusData } = await supabase
        .from('farmer_status')
        .select('status')
        .eq('farmer_id', data.id)
        .single();

      if (!statusData || !APPROVED_FARMER_STATUSES.has(statusData.status)) {
        return res.status(403).json({ error: 'Farmer not approved yet. Contact admin.' });
      }

      // Get passport score
      const getTier = (score) => {
        if (score >= 80) return 'Platinum';
        if (score >= 60) return 'Gold';
        if (score >= 40) return 'Silver';
        return 'Bronze';
      };

      const { data: passport } = await supabase
        .from('passports')
        .select('*')
        .eq('farmer_id', data.id)
        .single();

      user = data;
      userId = data.id;
      userName = data.name;
      passportScore = passport?.trust_score || 0;
      passportTier = getTier(passportScore);

    } else if (role === 'buyer') {
      const { data, error } = await supabase
        .from('buyers')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        return res.status(401).json({ error: 'Buyer not found' });
      }

      const valid = await bcrypt.compare(password, data.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      if (data.status !== 'active') {
        return res.status(403).json({ error: 'Account suspended' });
      }

      user = data;
      userId = data.id;
      userName = data.name;
      passportScore = data.passport_score;
      passportTier = data.passport_tier;
    }

    // Generate JWT
    const token = jwt.sign(
      { userId, role, userName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: userId,
        name: userName,
        role,
        passport_score: passportScore,
        passport_tier: passportTier
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/auth/buyer-register
const buyerRegister = async (req, res) => {
  try {
    const {
      name, phone, email, password,
      business_name, business_type,
      city, state, preferred_crops
    } = req.body;

    if (!name || !phone || !email || !password || !business_name || !business_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check email exists
    const { data: existing } = await supabase
      .from('buyers')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: buyer, error } = await supabase
      .from('buyers')
      .insert([{
        name, phone, email, password_hash,
        business_name, business_type,
        city: city || null,
        state: state || null,
        preferred_crops: preferred_crops || [],
        passport_score: 50,
        passport_tier: 'Silver',
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign(
      { userId: buyer.id, role: 'buyer', userName: buyer.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Buyer registered successfully',
      token,
      user: {
        id: buyer.id,
        name: buyer.name,
        role: 'buyer',
        passport_score: 50,
        passport_tier: 'Silver'
      }
    });

  } catch (err) {
    console.error('Buyer register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/auth/passport/:userId/:role
const getPassport = async (req, res) => {
  try {
    const { userId, role } = req.params;

    if (role === 'farmer') {
      const getTier = (score) => {
        if (score >= 80) return 'Platinum';
        if (score >= 60) return 'Gold';
        if (score >= 40) return 'Silver';
        return 'Bronze';
      };

      const { data: farmer } = await supabase
        .from('farmers')
        .select('id, name, phone, village, district')
        .eq('id', userId)
        .single();

      const { data: passport } = await supabase
        .from('passports')
        .select('*')
        .eq('farmer_id', userId)
        .single();

      const { data: deals } = await supabase
        .from('deals')
        .select('id, final_price_per_kg, total_value, created_at')
        .eq('farmer_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      return res.status(200).json({
        role: 'farmer',
        name: farmer?.name,
        location: `${farmer?.village || ''}, ${farmer?.district || ''}`,
        passport_score: passport?.trust_score || 0,
        passport_tier: getTier(passport?.trust_score || 0),
        genuinity_score: passport?.genuinity_score || 0,
        total_deals: passport?.total_deals || 0,
        successful_deals: passport?.successful_deals || 0,
        quality_verified: passport?.quality_verified || false,
        organic_certified: passport?.organic_certified || false,
        delivery_reliability: passport?.delivery_reliability || 0,
        recent_deals: deals || [],
        passport_details: passport
      });

    } else if (role === 'buyer') {
      const { data: buyer } = await supabase
        .from('buyers')
        .select('*')
        .eq('id', userId)
        .single();

      const { data: deals } = await supabase
        .from('deals')
        .select('id, final_price_per_kg, total_value, created_at')
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      return res.status(200).json({
        role: 'buyer',
        name: buyer?.name,
        business_name: buyer?.business_name,
        business_type: buyer?.business_type,
        location: `${buyer?.city || ''}, ${buyer?.state || ''}`,
        passport_score: buyer?.passport_score || 0,
        passport_tier: buyer?.passport_tier || 'Silver',
        total_deals: deals?.length || 0,
        recent_deals: deals || [],
        preferred_crops: buyer?.preferred_crops || []
      });
    }

    return res.status(400).json({ error: 'Invalid role' });

  } catch (err) {
    console.error('Passport error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { login, buyerRegister, getPassport };
