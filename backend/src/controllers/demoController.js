const sessions = new Map();

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

module.exports = {
  startDemoNegotiation,
  getDemoNegotiation,
  streamDemoNegotiation,
  approveDemoNegotiation
};
