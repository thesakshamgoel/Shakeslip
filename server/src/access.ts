import { db } from './db.ts'
import { isInterState, stateOf } from './gst.ts'
import { extraSchema } from './schemas.ts'
import { json, totals, type Item } from './util.ts'

/* Central ownership checks. Every route goes through one of these. */
export type Biz = { id: string; owner_id: string; name: string; slug: string; gstin: string; state: string; address: string; city: string; email: string; phone: string; auto_approve: number }
export const bizOf = (userId: string) => db.query('SELECT * FROM businesses WHERE owner_id = ?').get(userId) as Biz | null

type InvRow = Record<string, any>
export const invoiceOfBiz = (bizId: string, id: string) =>
  db.query('SELECT * FROM invoices WHERE id = ? AND business_id = ? AND deleted_at IS NULL').get(id, bizId) as InvRow | null
/* A client may only open invoices on an active link that belongs to their own account. */
export const invoiceOfClient = (userId: string, id: string) =>
  db.query(`SELECT i.* FROM invoices i JOIN links l ON l.id = i.link_id
    WHERE i.id = ? AND l.user_id = ? AND l.status = 'active' AND l.deleted_at IS NULL AND i.deleted_at IS NULL AND i.status != 'draft' AND i.delivery != 'pdf'`).get(id, userId) as InvRow | null

export function paidSum(invoiceId: string): number {
  /* payments, advances, TDS and write-offs reduce what is owed; a refund adds it back */
  return (db.query("SELECT COALESCE(SUM(CASE WHEN kind = 'refund' THEN -amount ELSE amount END),0) AS s FROM payments WHERE invoice_id = ? AND status = 'confirmed'").get(invoiceId) as { s: number }).s
}

export function displayStatus(row: InvRow, balance: number): string {
  const s = row.status as string
  if (s === 'draft' || s === 'paid' || s === 'void') return s
  if (balance <= 0) return 'paid'
  return new Date(row.due).getTime() < Date.now() ? 'overdue' : s
}

/* The business details shown on an invoice. Live while drafting, frozen at the moment it is sent. */
export function fromDetails(bizId: string) {
  const b = db.query('SELECT * FROM businesses WHERE id = ?').get(bizId) as any
  return {
    id: b.id, name: b.name, gstin: b.gstin, pan: b.pan, address: b.address, area: b.area, pin: b.pin, city: b.city, state: b.state, email: b.email, phone: b.phone, website: b.website,
    upiId: b.upi_id, bankName: b.bank_name, accountName: b.account_name, accountNo: b.account_no, ifsc: b.ifsc, signature: json(b.signature, {}),
    logo: b.logo, logoSize: b.logo_size, phones: json(b.phones ?? '[]', [] as { id: string; label: string; number: string; isDefault: boolean }[]), emails: json(b.emails ?? '[]', [] as { id: string; label: string; address: string; isDefault: boolean }[]), qrImage: b.qr_image,
  }
}

export const rowTotals = (r: InvRow) => totals(json<Item[]>(r.items, []), r.gst_pct, r.discount, r.advance, !!r.tax_inclusive)

export function invoiceDto(row: InvRow, role: 'business' | 'client') {
  const items = json<Item[]>(row.items, [])
  const t = totals(items, row.gst_pct, row.discount, row.advance, !!row.tax_inclusive)
  const paid = paidSum(row.id)
  const balance = row.status === 'void' ? 0 : Math.max(t.total - t.advance - paid, 0)
  const aud = role === 'business' ? 'business' : 'client'
  const events = db.query("SELECT kind,text,at FROM events WHERE invoice_id = ? AND audience IN ('both', ?) ORDER BY at DESC").all(row.id, aud)
  const pays = db.query(`SELECT id,amount,method,ref,note,kind,paid_at AS paidAt,status FROM payments WHERE invoice_id = ? ORDER BY paid_at DESC`).all(row.id)
  const marks = db.query('SELECT id,page,x,y,text,created_at AS at FROM annotations WHERE invoice_id = ? ORDER BY created_at, rowid').all(row.id)
  const biz = row.from_snapshot ? json<ReturnType<typeof fromDetails>>(row.from_snapshot, fromDetails(row.business_id)) : fromDetails(row.business_id)
  const billTo = json<Record<string, string>>(row.bill_to, {})
  const interState = isInterState(stateOf(biz.gstin, biz.state), stateOf(billTo.gstin, billTo.state))
  return {
    id: row.id, number: row.number, status: displayStatus(row, balance), rawStatus: row.status, linkId: row.link_id, typeId: row.type_id,
    type: json(row.type_snapshot, {}), theme: row.theme, billTo, items, fields: json<Record<string, string>>(row.fields, {}),
    gstPct: row.gst_pct, discount: row.discount, advance: row.advance, issued: row.issued, due: row.due, note: row.note, sentAt: row.sent_at,
    totals: { ...t, paid, balance }, payments: pays, events, from: biz,
    project: row.project, terms: json<string[]>(row.terms, []), taxInclusive: !!row.tax_inclusive, interState,
    extra: extraSchema.parse(json(row.extra ?? '{}', {})), voidReason: row.void_reason, delivery: row.delivery, annotations: marks,
    acceptance: { required: !!row.needs_accept, at: row.accepted_at ?? null, name: row.accepted_name ?? '', signature: row.accepted_sig ?? '' },
  }
}
