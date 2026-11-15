/* Connect codes refresh every 24 hours. "Refreshes in 5 h 20 min" */
export function codeLeft(at?: string): string {
  if (!at) return 'Refreshes every 24 hours'
  const ms = new Date(at).getTime() + 86_400_000 - Date.now()
  if (ms <= 0) return 'Refreshing now'
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000)
  return `Refreshes in ${h ? `${h} h ` : ''}${m} min`
}
