const calculatePassportScore = (survey) => {
  let score = 0;
  const breakdown = {};

  let s1 = 0;
  if (survey.aadhaar_verified) s1 += 5;
  if (survey.land_proof_verified) s1 += 5;
  if (survey.land_acres >= 5) s1 += 5;
  else if (survey.land_acres >= 1) s1 += 4;
  else s1 += 2;
  if (survey.irrigation_type === 'drip') s1 += 5;
  else if (survey.irrigation_type === 'borewell' || survey.irrigation_type === 'canal') s1 += 3;
  else s1 += 1;
  breakdown.identity_land = Math.min(s1, 20);
  score += breakdown.identity_land;

  let s2 = 0;
  if (survey.years_farming >= 10) s2 += 10;
  else if (survey.years_farming >= 5) s2 += 8;
  else if (survey.years_farming >= 2) s2 += 5;
  else s2 += 2;
  if (survey.crops_per_year >= 3) s2 += 10;
  else if (survey.crops_per_year >= 2) s2 += 5;
  else s2 += 2;
  breakdown.farming_experience = Math.min(s2, 20);
  score += breakdown.farming_experience;

  let s3 = 0;
  if (survey.organic_certified) s3 += 10;
  if (survey.fssai_registered) s3 += 5;
  if (survey.pesticide_responsible) s3 += 3;
  if (survey.lab_tested) s3 += 2;
  breakdown.quality_certifications = Math.min(s3, 20);
  score += breakdown.quality_certifications;

  let s4 = 0;
  if (survey.sold_outside_mandi) s4 += 5;
  if (survey.prior_buyer_relations) s4 += 5;
  if (survey.consistent_harvest) s4 += 10;
  if (survey.dispute_history) s4 -= 10;
  breakdown.market_history = s4;
  score += s4;

  let s5 = 0;
  if (survey.has_storage) s5 += 5;
  if (survey.has_transport) s5 += 5;
  if (survey.has_smartphone) s5 += 5;
  if (survey.near_major_market) s5 += 5;
  breakdown.infrastructure = Math.min(s5, 20);
  score += breakdown.infrastructure;

  const total = Math.max(0, Math.min(100, score));
  let tier = '';
  if (total >= 80) tier = 'Platinum';
  else if (total >= 60) tier = 'Gold';
  else if (total >= 40) tier = 'Silver';
  else tier = 'Bronze';

  return { total_score: total, tier, breakdown };
};

module.exports = { calculatePassportScore };
