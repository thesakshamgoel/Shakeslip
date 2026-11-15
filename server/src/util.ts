import { createHash, randomBytes } from 'node:crypto'

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
export const token = (bytes = 32) => randomBytes(bytes).toString('base64url')
export const json = <T,>(s: string, fallback: T): T => { try { return JSON.parse(s) as T } catch { return fallback } }

export type Item = { id: string; desc: string; qty: number; rate: number }
export type Totals = { subtotal: number; discount: number; taxable: number; gst: number; total: number; advance: number }

/* All money is integer paise. */
export function totals(items: Item[], gstPct: number, discount: number, advance: number, inclusive = false): Totals {
  const subtotal = items.reduce((n, i) => n + Math.round(i.qty * i.rate), 0)
  const disc = Math.min(discount, subtotal)
  const after = subtotal - disc
  /* Tax-inclusive prices: the GST is already inside the amount, so it is backed out instead of added. */
  const taxable = inclusive ? Math.round((after * 100) / (100 + gstPct)) : after
  const gst = inclusive ? after - taxable : Math.round((taxable * gstPct) / 100)
  return { subtotal, discount: disc, taxable, gst, total: taxable + gst, advance }
}

/* Indian financial year, April to March: 2026-27 */
export function financialYear(iso: string): string {
  const d = new Date(iso)
  const y = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`
}

export const maskEmail = (e: string) => {
  const [u, d] = e.split('@')
  return u ? `${u.slice(0, 1)}${'*'.repeat(Math.max(u.length - 1, 1))}@${d}` : ''
}
export const digits = (p: string) => p.replace(/\D/g, '')

const inrFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
export const inr = (paise: number) => inrFmt.format(paise / 100)
const fmts = new Map<string, Intl.NumberFormat>()
/* Any supported currency. Amounts are always stored in the smallest unit (paise, cents). */
export const money = (minor: number, currency = 'INR') => {
  if (currency === 'INR') return inr(minor)
  let f = fmts.get(currency)
  if (!f) { f = new Intl.NumberFormat('en-IN', { style: 'currency', currency }); fmts.set(currency, f) }
  return f.format(minor / 100)
}
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
