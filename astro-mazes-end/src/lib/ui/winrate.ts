export function normalizeWinratePercent (
  avgWinRate?: number,
  wins?: number,
  losses?: number,
  draws?: number
): number {
  // Prefer explicit average if provided
  if (typeof avgWinRate === 'number') {
    return Math.round(avgWinRate <= 1 ? avgWinRate * 100 : avgWinRate)
  }
  // Fallback to record
  const w = Number(wins || 0)
  const l = Number(losses || 0)
  const d = Number(draws || 0)
  const games = w + l + d
  if (games <= 0) return 0
  return Math.round((w / games) * 100)
}

