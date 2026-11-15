/* Indian financial year, April to March: "2026-27". */
export function financialYear(iso: string): string {
  const d = new Date(iso)
  const y = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`
}
