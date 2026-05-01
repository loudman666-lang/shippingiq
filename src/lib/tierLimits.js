export const TIER_LIMITS = {
  free:    { carriers: 1,        converter: false, teamMembers: 1 },
  starter: { carriers: 3,        converter: false, teamMembers: 1 },
  growth:  { carriers: 10,       converter: true,  teamMembers: 3 },
  pro:     { carriers: Infinity, converter: true,  teamMembers: Infinity },
}

export function getTierLimit(planTier, feature) {
  return TIER_LIMITS[planTier]?.[feature] ?? TIER_LIMITS.free[feature]
}
