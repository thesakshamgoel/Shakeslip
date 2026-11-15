import type { DocData } from '../components/InvoiceDocument'
import type { InvoiceView } from './types'

export const docOf = (v: InvoiceView): DocData => ({
  number: v.number, type: v.type, theme: v.theme, billTo: v.billTo, from: v.from, items: v.items, fields: v.fields, gstPct: v.gstPct,
  issued: v.issued, due: v.due, note: v.note, project: v.project, terms: v.terms, taxInclusive: v.taxInclusive, interState: v.interState,
  status: v.status, totals: v.totals, extra: v.extra, voidReason: v.voidReason, acceptance: v.acceptance,
})
