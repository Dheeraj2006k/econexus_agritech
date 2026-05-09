const sessions = new Map();
const farmers = new Map();
const buyerRequests = new Map();

const demoScript = [
  {
    type: 'log',
    agent: 'Farmer Agent',
    message: 'Verified Raju Kumar passport, Grade A tomato listing, and freshness window.',
    delay: 400
  },
  {
    type: 'log',
    agent: 'Semantic Matcher',
    message: 'Matched FreshMart Wholesale at 94% relevance for 500kg fresh tomatoes.',
    delay: 900
  },
  {
    type: 'log',
    agent: 'Super Agent',
    message: 'Transport distance is low. Spoilage risk is moderate. Deal priority raised.',
    delay: 1400
  },
  {
    type: 'offer',
    agent: 'Buyer Agent',
    message: 'Buyer opened at Rs 24/kg against farmer expectation of Rs 30/kg.',
    buyer_offer: 24,
    delay: 2000
  },
  {
    type: 'analysis',
    agent: 'Fair Price Engine',
    message: 'Mandi reference, urgency, quality, and logistics suggest a fair settlement near Rs 27/kg.',
    fairness_score: 91,
    delay: 2800
  },
  {
    type: 'counter',
    agent: 'Negotiation Agent',
    message: 'Counter generated at Rs 27/kg with same-day pickup and full quantity commitment.',
    ai_suggested_price: 27,
    delay: 3600
  },
  {
    type: 'ready',
    agent: 'Human Approval',
    message: 'Deal is ready for approval. Farmer earns Rs 13,500 and buyer receives verified produce.',
    delay: 4500
  }
];

const buildSession = () => {
  const id = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  const session = {
    id,
    status: 'running',
    created_at: now,
    approved_at: null,
    crop: 'Fresh Tomatoes',
    quantity_kg: 500,
    farmer: {
      id: 'farmer_demo_001',
      name: 'Raju Kumar',
      village: 'Chevella',
      passport_score: 82,
      tier: 'Gold'
    },
    buyer: {
      id: 'buyer_demo_001',
      business_name: 'FreshMart Wholesale',
      city: 'Hyderabad',
      passport_score: 88,
      tier: 'Gold'
    },
    pricing: {
      farmer_expected: 30,
      buyer_offered: null,
      ai_suggested: null,
      final_price: null,
      fairness_score: null
    },
    logistics: {
      distance_km: 28,
      pickup_window: 'Today, 5:30 PM',
      route_score: 89
    },
    logs: []
  };

  sessions.set(id, session);
  return session;
};

const publicSession = (session) => ({
  id: session.id,
  status: session.status,
  created_at: session.created_at,
  approved_at: session.approved_at,
  crop: session.crop,
  quantity_kg: session.quantity_kg,
  farmer: session.farmer,
  buyer: session.buyer,
  pricing: session.pricing,
  logistics: session.logistics,
  total_value: session.pricing.final_price
    ? session.pricing.final_price * session.quantity_kg
    : null,
  logs: session.logs
});

const startDemoNegotiation = (req, res) => {
  const session = buildSession();
  return res.status(201).json({
    success: true,
    message: 'Live demo negotiation started',
    session: publicSession(session)
  });
};

const getDemoNegotiation = (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Demo negotiation not found' });
  }

  return res.status(200).json({ success: true, session: publicSession(session) });
};

const streamDemoNegotiation = (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Demo negotiation not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  send('snapshot', publicSession(session));

  const timers = demoScript.map((step, index) => setTimeout(() => {
    if (session.status === 'approved') return;

    const entry = {
      id: `${session.id}_${index}`,
      at: new Date().toISOString(),
      type: step.type,
      agent: step.agent,
      message: step.message
    };

    if (step.buyer_offer) session.pricing.buyer_offered = step.buyer_offer;
    if (step.ai_suggested_price) session.pricing.ai_suggested = step.ai_suggested_price;
    if (step.fairness_score) session.pricing.fairness_score = step.fairness_score;
    if (step.type === 'ready') session.status = 'awaiting_approval';

    session.logs.push(entry);
    send('update', { entry, session: publicSession(session) });

    if (step.type === 'ready') {
      send('ready', publicSession(session));
    }
  }, step.delay));

  req.on('close', () => {
    timers.forEach(clearTimeout);
  });
};

const approveDemoNegotiation = (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Demo negotiation not found' });
  }

  const finalPrice = Number(req.body?.final_price || session.pricing.ai_suggested || 27);
  session.status = 'approved';
  session.approved_at = new Date().toISOString();
  session.pricing.final_price = finalPrice;
  session.pricing.ai_suggested = session.pricing.ai_suggested || finalPrice;
  session.pricing.fairness_score = session.pricing.fairness_score || 91;
  session.logs.push({
    id: `${session.id}_approved`,
    at: session.approved_at,
    type: 'approved',
    agent: 'Admin',
    message: `Deal approved at Rs ${finalPrice}/kg. Passport scores queued for update.`
  });

  return res.status(200).json({
    success: true,
    message: 'Deal approved and executed',
    session: publicSession(session)
  });
};

const demoOverview = (req, res) => {
  return res.status(200).json({
    success: true,
    stats: {
      farmers: 128,
      active_passports: 117,
      buyers: 34,
      live_negotiations: 7,
      cooperative_orders: 4,
      waste_saved_kg: 1840,
      avg_fairness_score: 91
    },
    modules: [
      { id: 'registration', name: 'Farmer Registration', status: 'demo-ready' },
      { id: 'passport', name: 'Digital Passport', status: 'demo-ready' },
      { id: 'matching', name: 'Semantic Matching', status: 'demo-ready' },
      { id: 'aggregation', name: 'Multi-Farmer Aggregation', status: 'demo-ready' },
      { id: 'negotiation', name: 'AI Negotiation', status: 'live' },
      { id: 'approval', name: 'Human Approval', status: 'live' },
      { id: 'logistics', name: 'Logistics Optimization', status: 'demo-ready' },
      { id: 'redistribution', name: 'Circular Redistribution', status: 'demo-ready' },
      { id: 'voice', name: 'Voice Rural Interface', status: 'demo-ready' }
    ],
    live_feed: [
      'Super Agent detected 500kg tomato supply near Chevella',
      'Semantic Matcher ranked FreshMart Wholesale at 94%',
      'Circular engine reserved NGO fallback for unsold surplus',
      'Logistics route HYD-28 optimized for same-day pickup'
    ]
  });
};

const registerDemoFarmer = (req, res) => {
  const input = req.body || {};
  const id = `farmer_${Date.now()}`;
  const qualityScore = input.organic_certified ? 88 : 78;
  const passportScore = Math.min(96, qualityScore + (input.land_verified ? 6 : 0) + (input.phone ? 4 : 0));
  const farmer = {
    id,
    name: input.name || 'Lakshmi Devi',
    phone: input.phone || '+91 90000 11223',
    village: input.village || 'Chevella',
    district: input.district || 'Rangareddy',
    language: input.language || 'Telugu',
    status: 'approved',
    passport: {
      score: passportScore,
      tier: passportScore >= 85 ? 'Gold' : 'Silver',
      genuinity_score: passportScore,
      quality_score: qualityScore,
      delivery_reliability: 84,
      sustainability_score: input.organic_certified ? 86 : 72,
      certifications: [
        input.organic_certified ? 'Organic Verified' : 'Quality Verified',
        'Aadhaar Checked',
        'Land Record Checked'
      ]
    },
    agent: {
      status: 'deployed',
      style: passportScore >= 85 ? 'value-protective' : 'balanced',
      max_rounds: 3
    }
  };

  farmers.set(id, farmer);
  return res.status(201).json({ success: true, farmer });
};

const createBuyerRequest = (req, res) => {
  const input = req.body || {};
  const id = `request_${Date.now()}`;
  const request = {
    id,
    buyer: input.buyer || 'FreshMart Wholesale',
    crop: input.crop || 'Tomatoes',
    quantity_kg: Number(input.quantity_kg || 5000),
    budget_per_kg: Number(input.budget_per_kg || 28),
    location: input.location || 'Hyderabad',
    urgency: input.urgency || 'same-day',
    status: 'matching',
    semantic_matches: [
      { farmer: 'Raju Kumar', crop: 'Fresh Tomatoes', quantity_kg: 500, score: 94, price_per_kg: 30 },
      { farmer: 'Lakshmi Devi', crop: 'Grade A Tomatoes', quantity_kg: 1300, score: 91, price_per_kg: 27 },
      { farmer: 'Mahesh Reddy', crop: 'Organic Tomato Produce', quantity_kg: 2200, score: 88, price_per_kg: 29 }
    ]
  };

  buyerRequests.set(id, request);
  return res.status(201).json({ success: true, request });
};

const runAggregation = (req, res) => {
  const quantityNeeded = Number(req.body?.quantity_kg || 5000);
  const farmersSelected = [
    { farmer: 'Raju Kumar', village: 'Chevella', quantity_kg: 500, price_per_kg: 30, passport_score: 82 },
    { farmer: 'Lakshmi Devi', village: 'Shabad', quantity_kg: 1300, price_per_kg: 27, passport_score: 88 },
    { farmer: 'Mahesh Reddy', village: 'Moinabad', quantity_kg: 2200, price_per_kg: 29, passport_score: 84 },
    { farmer: 'Anitha Bai', village: 'Vikarabad', quantity_kg: 1100, price_per_kg: 26, passport_score: 79 }
  ];
  const total = farmersSelected.reduce((sum, item) => sum + item.quantity_kg, 0);
  const weightedValue = farmersSelected.reduce((sum, item) => sum + item.quantity_kg * item.price_per_kg, 0);

  return res.status(200).json({
    success: true,
    aggregation: {
      crop: req.body?.crop || 'Tomatoes',
      quantity_needed: quantityNeeded,
      total_aggregated: total,
      fulfillment_possible: total >= quantityNeeded,
      combined_price: Number((weightedValue / total).toFixed(2)),
      farmers_selected: farmersSelected,
      pooled_passport_score: 84,
      plan: 'Four nearby farmers can fulfill the buyer demand with one shared pickup route and pooled quality verification.'
    }
  });
};

const optimizeLogistics = (req, res) => {
  return res.status(200).json({
    success: true,
    logistics: {
      route: ['Chevella', 'Shabad', 'Moinabad', 'FreshMart Hyderabad DC'],
      distance_km: 61,
      estimated_cost: 4200,
      shared_savings: 1800,
      pickup_window: 'Today 4:30 PM - 6:00 PM',
      cold_storage_required: false,
      route_score: 92,
      spoilage_risk: 'low'
    }
  });
};

const runRedistribution = (req, res) => {
  return res.status(200).json({
    success: true,
    redistribution: {
      trigger: 'Unsold produce after 6 hours',
      crop: req.body?.crop || 'Tomatoes',
      quantity_kg: Number(req.body?.quantity_kg || 320),
      options: [
        { channel: 'NGO Food Relief', quantity_kg: 120, impact: 'meals for 600 people' },
        { channel: 'Food Processor', quantity_kg: 150, impact: 'sauce/puree conversion' },
        { channel: 'Animal Feed', quantity_kg: 50, impact: 'zero-waste fallback' }
      ],
      waste_prevented_percent: 100
    }
  });
};

const semanticSearch = (req, res) => {
  const query = req.body?.query || 'fresh premium tomatoes';
  return res.status(200).json({
    success: true,
    query,
    interpretation: 'Fresh premium tomatoes ~= Grade A red tomatoes ~= Organic tomato produce',
    matches: [
      { listing: 'Fresh Tomatoes', farmer: 'Raju Kumar', similarity: 0.94 },
      { listing: 'Grade A Red Tomato', farmer: 'Lakshmi Devi', similarity: 0.91 },
      { listing: 'Organic Tomato Produce', farmer: 'Mahesh Reddy', similarity: 0.88 }
    ]
  });
};

const communityFeed = (req, res) => {
  return res.status(200).json({
    success: true,
    groups: [
      { name: 'Chevella Tomato Cluster', farmers: 18, active_supply_kg: 6400, trust_score: 86 },
      { name: 'Rangareddy Organic Circle', farmers: 11, active_supply_kg: 2800, trust_score: 91 }
    ],
    feed: [
      'Lakshmi Devi endorsed Raju Kumar for quality consistency',
      'Chevella cluster opened shared truck for Hyderabad route',
      'Mahesh Reddy flagged urgent surplus for redistribution'
    ]
  });
};

const parseVoiceIntent = (req, res) => {
  const transcript = req.body?.transcript || 'I want to sell 500kg tomatoes today';
  return res.status(200).json({
    success: true,
    transcript,
    detected_language: 'English/Telugu mixed',
    intent: 'create_listing',
    structured_listing: {
      crop_name: 'Tomatoes',
      quantity_kg: 500,
      urgency: 'today',
      expected_price_per_kg: 30,
      location: 'Chevella'
    },
    spoken_response: 'Your tomato listing is ready. I will search verified buyers near Hyderabad.'
  });
};

module.exports = {
  startDemoNegotiation,
  getDemoNegotiation,
  streamDemoNegotiation,
  approveDemoNegotiation,
  demoOverview,
  registerDemoFarmer,
  createBuyerRequest,
  runAggregation,
  optimizeLogistics,
  runRedistribution,
  semanticSearch,
  communityFeed,
  parseVoiceIntent
};
