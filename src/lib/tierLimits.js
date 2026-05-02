export const TIER_LIMITS = {
  free: { carriers: 1, converter: false },
  pro:  { carriers: Infinity, converter: true },
}

export function getTierLimit(planTier, feature) {
  return TIER_LIMITS[planTier]?.[feature] ?? TIER_LIMITS.free[feature]
}
