'use client';
import { getTierColor } from '@/lib/auth';

export default function PassportCard({ passport, compact = false }) {
  if (!passport) return null;

  const tierColor = getTierColor(passport.passport_tier);
  const score = passport.passport_score || 0;

  return (
    <div className="border bg-white/[0.02] p-4 relative overflow-hidden"
      style={{ borderColor: `${tierColor}40` }}>
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: tierColor }} />

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white font-mono text-sm font-bold">{passport.name}</p>
          {passport.business_name && (
            <p className="text-white/40 text-xs font-mono">{passport.business_name}</p>
          )}
          <p className="text-white/30 text-xs font-mono">{passport.location}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-mono" style={{ color: tierColor }}>{score}</p>
          <p className="text-xs font-mono tracking-widest" style={{ color: tierColor }}>
            {passport.passport_tier}
          </p>
        </div>
      </div>

      <div className="h-1 bg-white/10 mb-4">
        <div className="h-full transition-all" style={{ width: `${score}%`, background: tierColor }} />
      </div>

      {!compact && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: 'TOTAL DEALS', value: passport.total_deals || 0 },
              { label: 'SUCCESSFUL', value: passport.successful_deals || 0 },
              { label: 'GENUINITY', value: `${passport.genuinity_score || 0}%` },
              { label: 'RELIABILITY', value: `${passport.delivery_reliability || 0}%` },
            ].filter(s => s.value !== undefined).map(stat => (
              <div key={stat.label} className="bg-white/[0.03] p-2">
                <p className="text-white/30 text-[10px] font-mono tracking-widest">{stat.label}</p>
                <p className="text-white text-sm font-mono font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          {passport.passport_details?.certifications?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {passport.passport_details.certifications.map(cert => (
                <span key={cert} className="text-[10px] font-mono px-2 py-0.5 border"
                  style={{ color: tierColor, borderColor: `${tierColor}40` }}>
                  {cert}
                </span>
              ))}
            </div>
          )}

          {passport.preferred_crops?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {passport.preferred_crops.map(crop => (
                <span key={crop} className="text-[10px] font-mono px-2 py-0.5 border border-white/10 text-white/40">
                  {crop}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
