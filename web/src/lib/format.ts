import type { LineItem, Totals } from './types'

/* Live totals while editing. The server recomputes authoritatively on save. */
export function liveTotals(items: LineItem[], gstPct: number, discount: number, advance: number, inclusive = false): Pick<Totals, 'subtotal' | 'discount' | 'taxable' | 'gst' | 'total' | 'advance'> {
  const subtotal = items.reduce((n, i) => n + Math.round(i.qty * i.rate), 0)
  const d = Math.min(discount, subtotal)
  const after = subtotal - d
  const taxable = inclusive ? Math.round((after * 100) / (100 + gstPct)) : after
  const gst = inclusive ? after - taxable : Math.round((taxable * gstPct) / 100)
  return { subtotal, discount: d, taxable, gst, total: taxable + gst, advance }
}
