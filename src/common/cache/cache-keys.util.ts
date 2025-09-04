// Centralized cache key builders to avoid stringly-typed keys across the codebase.
export const CacheKeys = {
  cardByHash: (hash: string) => `card:hash:${hash}`,
  cardByLast4: (l4: string) => `card:last4:${l4}`,
  org: (orgId: string) => `org:${orgId}`,
  orgAcc: (orgId: string) => `orgacc:${orgId}`,
  rules: (cardId: string) => `rules:${cardId}`,
  stationByCode: (code: string) => `station:code:${code}`,
  webhookEvent: (stationId: string, idemKey: string) => `we:${stationId}:${idemKey}`,
  usageDaily: (cardId: string, startIso: string) => `bucket:daily:${cardId}:${startIso}`,
  usageMonthly: (cardId: string, startIso: string) => `bucket:monthly:${cardId}:${startIso}`,
} as const;