const supabase = require('../db/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { calculatePassportScore } = require('../utils/scoreCalculator');

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();
    if (error || !admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = jwt.sign(
      { id: admin.id, role: admin.role, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.status(200).json({
      success: true,
      message: `Welcome back, ${admin.name}`,
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, region: admin.region }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const registerFarmer = async (req, res) => {
  try {
    const { name, phone, village, district, state, language, land_area_acres } = req.body;
    const adminId = req.admin.id;
    const { data: existing } = await supabase.from('farmers').select('id').eq('phone', phone).single();
    if (existing) return res.status(400).json({ success: false, message: 'Farmer with this phone already registered' });
    const { data: farmer, error: farmerError } = await supabase
      .from('farmers')
      .insert([{ name, phone, village, district, state, language: language || 'Telugu', land_area_acres: land_area_acres || 0 }])
      .select()
      .single();
    if (farmerError) throw farmerError;
    await supabase.from('farmer_status').insert([{ farmer_id: farmer.id, status: 'pending' }]);
    return res.status(201).json({ success: true, message: `Farmer ${farmer.name} registered. Complete survey to activate.`, farmer });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const submitSurvey = async (req, res) => {
  try {
    const { farmer_id, admin_notes, ...surveyData } = req.body;
    const adminId = req.admin.id;
    const { total_score, tier, breakdown } = calculatePassportScore(surveyData);
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .insert([{ farmer_id, admin_id: adminId, ...surveyData, calculated_score: total_score, score_breakdown: breakdown, admin_notes }])
      .select()
      .single();
    if (surveyError) throw surveyError;
    await supabase.from('farmer_status').update({ status: 'surveyed', survey_id: survey.id, updated_at: new Date().toISOString() }).eq('farmer_id', farmer_id);
    return res.status(200).json({ success: true, message: 'Survey submitted', survey_id: survey.id, calculated_score: total_score, tier, breakdown, next_step: 'Admin must approve to deploy AI agent' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const buildCertificationsList = (survey) => {
  const certs = [];
  if (survey.organic_certified) certs.push('Organic');
  if (survey.fssai_registered) certs.push('FSSAI');
  if (survey.lab_tested) certs.push('Lab Tested');
  if (survey.aadhaar_verified) certs.push('Aadhaar Verified');
  if (survey.land_proof_verified) certs.push('Land Verified');
  return certs;
};

const approveFarmer = async (req, res) => {
  try {
    const { farmer_id } = req.params;
    const adminId = req.admin.id;
    const { data: status } = await supabase.from('farmer_status').select('*, surveys(*)').eq('farmer_id', farmer_id).single();
    if (!status || status.status !== 'surveyed') return res.status(400).json({ success: false, message: 'Farmer must complete survey before approval' });
    const survey = status.surveys;
    const { total_score, tier, breakdown } = calculatePassportScore(survey);
    // Check if passport already exists
    const { data: existingPassport } = await supabase
      .from('passports')
      .select('id')
      .eq('farmer_id', farmer_id)
      .single();

    let passport;
    if (existingPassport) {
      const { data, error: updateError } = await supabase
        .from('passports')
        .update({
          trust_score: total_score,
          genuinity_score: total_score,
          quality_verified: survey.lab_tested || survey.fssai_registered,
          organic_certified: survey.organic_certified,
          certifications: buildCertificationsList(survey)
        })
        .eq('farmer_id', farmer_id)
        .select()
        .single();
      if (updateError) throw updateError;
      passport = data;
    } else {
      const { data, error: insertError } = await supabase
        .from('passports')
        .insert([{
          farmer_id,
          trust_score: total_score,
          genuinity_score: total_score,
          total_deals: 0,
          successful_deals: 0,
          quality_verified: survey.lab_tested || survey.fssai_registered,
          organic_certified: survey.organic_certified,
          certifications: buildCertificationsList(survey),
          delivery_reliability: 0
        }])
        .select()
        .single();
      if (insertError) throw insertError;
      passport = data;
    }
    const agentConfig = { farmer_id, agent_type: 'local_farmer_agent', passport_score: total_score, tier, negotiation_style: total_score >= 70 ? 'aggressive' : 'balanced', min_price_flexibility: 0.10, max_rounds: 3, deployed_at: new Date().toISOString() };
    await supabase.from('farmer_status').update({ status: 'active', agent_deployed: true, agent_deployed_at: new Date().toISOString(), approved_by: adminId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('farmer_id', farmer_id);
    return res.status(200).json({ success: true, message: 'Farmer approved. AI Agent deployed.', passport: { trust_score: total_score, tier, breakdown }, agent: agentConfig });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getPendingFarmers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('farmer_status')
      .select('*, farmers(id, name, phone, village, district, state)')
      .in('status', ['pending', 'surveyed'])
      .order('updated_at', { ascending: true });
    if (error) throw error;
    return res.status(200).json({ success: true, count: data.length, farmers: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const [farmers, buyers, listings, negotiations, deals] = await Promise.all([
      supabase.from('farmers').select('id, name', { count: 'exact' }),
      supabase.from('buyers').select('id, name, passport_score, passport_tier'),
      supabase.from('listings').select('*').eq('status', 'active'),
      supabase.from('negotiations').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('deals').select('*').order('created_at', { ascending: false }).limit(5)
    ]);

    return res.status(200).json({
      stats: {
        total_farmers: farmers.data?.length || 0,
        total_buyers: buyers.data?.length || 0,
        active_listings: listings.data?.length || 0,
        total_deals: deals.data?.length || 0
      },
      active_listings: listings.data || [],
      recent_negotiations: negotiations.data || [],
      recent_deals: deals.data || [],
      top_buyers: (buyers.data || []).sort((a, b) => b.passport_score - a.passport_score).slice(0, 3)
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { adminLogin, registerFarmer, submitSurvey, approveFarmer, getPendingFarmers, getDashboardStats };
