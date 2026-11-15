import { stateOf, supplyLabel } from '../lib/gst'
import { planRows } from '../lib/scope'
import type { DocData } from './InvoiceDocument'

/* Splits a long invoice over A4 pages. Sizes are in cqw (1% of page width) and were measured
   from the rendered document, so a page never runs past the paper and print never adds a blank sheet. */
const USABLE = 123, GAP = 2.1, THEAD = 4.4, CONT_HEAD = 8.6
const LOGO = { s: 7, m: 10, l: 13, xl: 17 }

export type InvPage = { from: number; to: number; first: boolean; tail: boolean }

/* What the pay block shows. Shared with the document so the plan and the page always agree. */
export function payFlags(d: DocData) {
  const x = d.extra
  const isQuote = /quot|estimate/i.test(d.type.title)
  const balance = d.status === 'paid' || d.status === 'void' ? 0 : (d.totals.balance ?? Math.max(d.totals.total - d.totals.advance, 0))
  const qrMode = x?.showQr === false ? 'none' : x?.qrMode ?? 'upi'
  return {
    isQuote, balance, qrMode,
    bankOn: !isQuote && (x?.showBank ?? true) && !!(d.from.accountNo || d.from.upiId),
    qrOn: !isQuote && balance > 0 && ((qrMode === 'upi' && !!d.from.upiId) || (qrMode === 'image' && !!d.from.qrImage)),
  }
}

const lines = (s: string, per: number) => Math.max(1, Math.ceil(s.length / per))

export function planInvoice(d: DocData): InvPage[] {
  const x = d.extra
  const { bankOn, qrOn } = payFlags(d)
  const qty = d.type.lineMode === 'qty_rate'
  const t = d.totals
  const supply = supplyLabel(stateOf(d.billTo?.gstin, d.billTo?.state)) || supplyLabel(stateOf(d.from.gstin, d.from.state))
  const top = d.type.fields.filter((f) => f.place === 'top' && d.fields[f.id]).length
  const bottom = d.type.fields.filter((f) => f.place === 'bottom' && d.fields[f.id]).length
  const facts = 4 + (d.from.gstin ? 1 : 0) + (d.from.pan ? 1 : 0) + (d.gstPct > 0 && supply ? 1 : 0) + (x?.category ? 1 : 0) + (x?.completionDate ? 1 : 0) + (x && x.plan.kind !== 'none' ? 1 : 0) + top
  const factsH = facts >= 9 ? Math.ceil(facts / 2) * 4.1 + 6 : facts * 2.2 + 6
  const headH = Math.max(12.9, d.from.logo ? LOGO[d.from.logoSize ?? 'm'] + 4.8 : 0)
  const banner = x?.banner || d.project
  const greet = (x?.salutation ? 2.4 : 0) + (x?.intro ? 2.4 * lines(x.intro, 95) : 0)
  const topBlocks = 3 + (greet ? 1 : 0) + (banner ? 1 : 0)
  const topH = headH + Math.max(24.6, factsH) + greet + (banner ? 5 : 0) + topBlocks * GAP + THEAD

  const L = 3 + (t.discount > 0 ? 1 : 0) + (d.gstPct > 0 && d.taxInclusive ? 1 : 0) + (d.gstPct > 0 ? (d.interState ? 1 : 2) : 0) + (t.advance > 0 ? 1 : 0) + (t.paid ? 1 : 0)
  const plan = x ? planRows(x.plan.kind, x.plan.advancePct, t.total, x.plan.text).length : 0
  const tailParts = [Math.max(12.5, 3.2 * L + 3), plan ? (plan + 1) * 4.2 + 2 : 0, qrOn ? 19.8 : bankOn ? 18.4 : 0, bottom * 7, d.note ? 2.4 * lines(d.note, 100) : 0, d.status === 'void' && d.voidReason ? 3 : 0, 8]
  const tailH = tailParts.reduce((a, b) => a + b, 0) + tailParts.filter(Boolean).length * GAP

  const rowH = (desc: string) => 4.7 + 2.4 * (lines(desc, qty ? 68 : 88) - 1)
  const pages: InvPage[] = []
  let start = 0, cap = USABLE - topH, used = 0
  d.items.forEach((it, i) => {
    const h = rowH(it.desc)
    if (used + h > cap && i > start) { pages.push({ from: start, to: i, first: !pages.length, tail: false }); start = i; cap = USABLE - CONT_HEAD - THEAD - GAP; used = 0 }
    used += h
  })
  pages.push({ from: start, to: d.items.length, first: !pages.length, tail: true })
  /* the totals and payment block do not fit under the last rows: they get their own page */
  if (cap - used < tailH && d.items.length > 0) { pages[pages.length - 1].tail = false; pages.push({ from: d.items.length, to: d.items.length, first: false, tail: true }) }
  return pages
}
