/* One place for how long each kind of text may be, so nothing runs out of its box on screen, on the invoice or in the PDF.
   The server enforces the same limits; these only stop the typing early and say so. */
export const LIMITS = {
  name: 80, company: 80, city: 60, area: 60, address: 200, email: 120, phone: 15, website: 120, gstin: 15, pan: 10, pin: 6,
  upi: 60, ifsc: 11, accountNo: 20, bank: 80, password: 128, number: 12, days: 3, line: 120, note: 600, clause: 600, terms: 10000, annexure: 6000, message: 500, default: 120,
} as const

type Hint = { type?: string; name?: string; label?: string; inputMode?: string }
export function capFor({ type, name = '', label = '', inputMode }: Hint): number {
  const k = `${name} ${label}`.toLowerCase()
  if (type === 'password') return LIMITS.password
  if (type === 'email' || /email/.test(k)) return LIMITS.email
  if (type === 'tel' || /phone|whatsapp|mobile/.test(k)) return LIMITS.phone
  if (/gstin/.test(k)) return LIMITS.gstin
  if (/\bpan\b/.test(k)) return LIMITS.pan
  if (/\bpin\b/.test(k)) return LIMITS.pin
  if (/ifsc/.test(k)) return LIMITS.ifsc
  if (/upi/.test(k)) return LIMITS.upi
  if (/account (number|no)|accountno/.test(k)) return LIMITS.accountNo
  if (/website/.test(k)) return LIMITS.website
  if (/address/.test(k)) return LIMITS.address
  if (/city|area/.test(k)) return LIMITS.city
  if (inputMode === 'decimal' || inputMode === 'numeric') return /days|grace/.test(k) ? LIMITS.days : LIMITS.number
  if (/bank|account name/.test(k)) return LIMITS.bank
  if (/name|company|attention/.test(k)) return LIMITS.name
  return LIMITS.default
}
