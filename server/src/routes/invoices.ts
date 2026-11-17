import { Hono } from 'hono'
import { bizOf, displayStatus, fromDetails, invoiceDto, invoiceOfBiz, paidSum, rowTotals } from '../access.ts'
import { requireUser, type Vars } from '../auth.ts'
import { audit, db, nowIso, uid } from '../db.ts'
import { renderPdf } from '../pdf.ts'
import { env } from '../env.ts'
import { addEvent, notify, notifyAndMail } from '../notify.ts'
import { extraSchema, invoiceBody, messageBody, paymentBody, paymentEditBody, paymentVoidBody, sendBody, type TypeSchema } from '../schemas.ts'
import { fail } from '../security.ts'
import { isQuote } from './stats.ts'
import { financialYear, json, money, shortDate, sha256, token, type Item } from '../util.ts'

export const invoices = new Hono<{ Variables: Vars }>()
invoices.use('*', requireUser)

type LinkRow = { id: string; user_id: string | null; name: string; email: string; phone: string; company: string; gstin: string; city: string; address: string; state: string; status: string; honorific: string; attention: string; area: string; pin: string; pan: string; logo: string }
const need = (c: any) => { const b = bizOf(c.get('user').id); return b }

/* the client's own number (from their My details) wins over the one the business typed */
const phoneOf = (link: LinkRow) => (link.user_id ? (db.query('SELECT phone FROM users WHERE id = ?').get(link.user_id) as { phone: string } | null)?.phone : '') || link.phone

function billTo(link: LinkRow) {
  /* The client's own profile wins; the business's record of them fills any gaps. */
  const prof = link.user_id ? (db.query('SELECT company,gstin,city,address,state,honorific,area,pin,pan,logo,phones,emails FROM client_profiles WHERE user_id = ?').get(link.user_id) as Record<string, string> | null) : null
  const pick = (k: string) => (prof?.[k] || (link as Record<string, unknown>)[k] || '') as string
  const contacts = (key: string) => json(prof?.[key] && prof[key] !== '[]' ? prof[key] : String((link as any)[key] ?? '[]'), [])
  return { phones: contacts('phones'), emails: contacts('emails'), name: link.name, company: pick('company'), gstin: pick('gstin'), city: pick('city'), address: pick('address'), state: pick('state'), email: link.email, phone: phoneOf(link),
    honorific: pick('honorific'), attention: link.attention || link.name, area: pick('area'), pin: pick('pin'), pan: pick('pan'), logo: pick('logo') }
}

function validate(b: ReturnType<typeof invoiceBody.parse>, bizId: string) {
  const link = db.query("SELECT * FROM links WHERE id = ? AND business_id = ? AND deleted_at IS NULL AND status IN ('active','invited')").get(b.linkId, bizId) as LinkRow | null
  if (!link) return { error: 'Pick a client you are connected to or have invited.' }
  const t = db.query('SELECT schema FROM invoice_types WHERE id = ? AND business_id = ?').get(b.typeId, bizId) as { schema: string } | null
  if (!t) return { error: 'Pick one of your own invoice types.' }
  const type = json<TypeSchema>(t.schema, null as never)
  const items = b.items.map((i) => (type.lineMode === 'amount_only' ? { ...i, qty: 1 } : i))
  const fields = Object.fromEntries(type.fields.map((f) => [f.id, b.fields[f.id] ?? '']))
  const ex = extraSchema.safeParse(b.extra ?? {})
  if (!ex.success) return { error: 'Please check the invoice settings and try again.' }
  return { link, type, items, fields, extra: ex.data, gstPct: type.taxMode === 'none' ? 0 : b.gstPct, discount: type.discount ? b.discount : 0, advance: type.advance ? b.advance : 0 }
}

invoices.get('/', (c) => {
  const biz = need(c)
  if (!biz) return c.json([])
  const rows = db.query(`SELECT i.*, l.name AS client_name, l.company AS client_company FROM invoices i JOIN links l ON l.id = i.link_id
    WHERE i.business_id = ? AND i.deleted_at IS NULL ORDER BY i.created_at DESC`).all(biz.id) as any[]
  return c.json(rows.map((r) => {
    const t = rowTotals(r)
    const balance = r.status === 'void' ? 0 : Math.max(t.total - t.advance - paidSum(r.id), 0)
    return { id: r.id, number: r.number, status: displayStatus(r, balance), client: r.client_company || r.client_name, linkId: r.link_id, project: r.project, currency: extraSchema.parse(json(r.extra ?? '{}', {})).currency, typeName: json<TypeSchema>(r.type_snapshot, null as never)?.title, due: r.due, issued: r.issued, total: t.total, balance }
  }))
})

invoices.get('/:id', (c) => {
  const biz = need(c)
  const row = biz && invoiceOfBiz(biz.id, c.req.param('id'))
  return row ? c.json(invoiceDto(row, 'business')) : fail(c, 404, 'ERR-INV-404', 'That invoice was not found.')
})

invoices.post('/', async (c) => {
  const biz = need(c)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = invoiceBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', 'Please check the invoice details and try again.')
  const v = validate(p.data, biz.id)
  if ('error' in v) return fail(c, 422, 'ERR-VAL-422', v.error as string)
  const id = uid()
  db.query(`INSERT INTO invoices (id,business_id,link_id,type_id,type_snapshot,theme,bill_to,items,fields,gst_pct,discount,advance,issued,due,note,project,terms,tax_inclusive,extra,status,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',?)`).run(id, biz.id, v.link.id, p.data.typeId, JSON.stringify(v.type), p.data.theme, JSON.stringify(billTo(v.link)), JSON.stringify(v.items), JSON.stringify(v.fields), v.gstPct, v.discount, v.advance, p.data.issued, p.data.due, p.data.note, p.data.project, JSON.stringify(p.data.terms), p.data.taxInclusive ? 1 : 0, JSON.stringify(v.extra), nowIso())
  addEvent(id, 'created', 'Draft created', 'business')
  return c.json({ id })
})

invoices.put('/:id', async (c) => {
  const biz = need(c)
  const row = biz && invoiceOfBiz(biz.id, c.req.param('id'))
  if (!biz || !row) return fail(c, 404, 'ERR-INV-404', 'That invoice was not found.')
  if (row.status !== 'draft') return fail(c, 409, 'ERR-INV-409', 'A sent invoice cannot be changed. Create a new one if something needs fixing.')
  const p = invoiceBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', 'Please check the invoice details and try again.')
  const v = validate(p.data, biz.id)
  if ('error' in v) return fail(c, 422, 'ERR-VAL-422', v.error as string)
  db.query(`UPDATE invoices SET link_id=?,type_id=?,type_snapshot=?,theme=?,bill_to=?,items=?,fields=?,gst_pct=?,discount=?,advance=?,issued=?,due=?,note=?,project=?,terms=?,tax_inclusive=?,extra=? WHERE id=?`)
    .run(v.link.id, p.data.typeId, JSON.stringify(v.type), p.data.theme, JSON.stringify(billTo(v.link)), JSON.stringify(v.items), JSON.stringify(v.fields), v.gstPct, v.discount, v.advance, p.data.issued, p.data.due, p.data.note, p.data.project, JSON.stringify(p.data.terms), p.data.taxInclusive ? 1 : 0, JSON.stringify(v.extra), row.id)
  return c.json({ id: row.id })
})

invoices.delete('/:id', (c) => {
  const biz = need(c)
  const row = biz && invoiceOfBiz(biz.id, c.req.param('id'))
  if (!biz || !row) return fail(c, 404, 'ERR-INV-404', 'That invoice was not found.')
  if (row.status !== 'draft') return fail(c, 409, 'ERR-INV-409', 'Only drafts can be deleted.')
  db.query('UPDATE invoices SET deleted_at = ? WHERE id = ?').run(nowIso(), row.id)
  return c.json({ ok: true })
})

/* Numbers are issued at send time so the series has no gaps (GST requires consecutive numbers). */
function issueNumber(bizId: string, row: any, type: TypeSchema): { number: string; seq: number; fy: string } {
  const fy = financialYear(row.issued)
  const last = db.query('SELECT COALESCE(MAX(seq),0) AS s FROM invoices WHERE business_id = ? AND type_id = ? AND fy = ?').get(bizId, row.type_id, fy) as { s: number }
  const seq = last.s + 1
  return { number: `${type.prefix}/${fy}/${String(seq).padStart(4, '0')}`, seq, fy }
}

function portalLink(row: any, link: LinkRow): string {
  if (link.user_id) return `${env.APP_URL}/slip/invoices/${row.id}`
  const t = token(24)
  db.query('UPDATE links SET invite_hash = ?, invite_expires = ? WHERE id = ?').run(sha256(t), new Date(Date.now() + 86_400_000).toISOString(), link.id)
  return `${env.APP_URL}/join/${t}`
}

invoices.post('/:id/send', async (c) => {
  const u = c.get('user')
  const biz = need(c)
  const row = biz && invoiceOfBiz(biz.id, c.req.param('id'))
  if (!biz || !row) return fail(c, 404, 'ERR-INV-404', 'That invoice was not found.')
  if (row.status !== 'draft') return fail(c, 409, 'ERR-INV-409', 'This invoice was already sent.')
  const type = json<TypeSchema>(row.type_snapshot, null as never)
  const fields = json<Record<string, string>>(row.fields, {})
  const missing = type.fields.find((f) => f.required && !fields[f.id]?.trim())
  if (missing) return fail(c, 422, 'ERR-VAL-422', `Please fill in "${missing.label}" before sending.`)
  const t = rowTotals(row)
  if (t.total <= 0) return fail(c, 422, 'ERR-VAL-422', 'Add at least one item with an amount before sending.')
  const opts = sendBody.safeParse(await c.req.json().catch(() => ({})))
  if (!opts.success) return fail(c, 422, 'ERR-VAL-422', 'Choose how to send this invoice.')
  const pdfOnly = opts.data.delivery === 'pdf'
  const needsAccept = !pdfOnly && opts.data.needsAccept
  const link = db.query('SELECT * FROM links WHERE id = ?').get(row.link_id) as LinkRow
  const n = issueNumber(biz.id, row, type)
  db.query("UPDATE invoices SET number=?,seq=?,fy=?,bill_to=?,from_snapshot=?,status='sent',sent_at=?,delivery=?,needs_accept=? WHERE id=?").run(n.number, n.seq, n.fy, JSON.stringify(billTo(link)), JSON.stringify(fromDetails(biz.id)), nowIso(), opts.data.delivery, needsAccept ? 1 : 0, row.id)
  const url = portalLink(row, link)
  const due = t.total - t.advance
  const cur = extraSchema.parse(json(row.extra ?? '{}', {})).currency
  const inr = (n: number) => money(n, cur)
  const body = `${biz.name} sent you ${type.title.toLowerCase()} ${n.number} for ${inr(due)}, due ${shortDate(row.due)}.${needsAccept ? ' Please review it and accept with your signature.' : ''}${link.user_id ? '' : ' Accept the invite to view it and get automatic updates.'}`
  if (!pdfOnly) await notifyAndMail(link.user_id, link.email, `${type.title} ${n.number} from ${biz.name}`, body, url)
  addEvent(row.id, 'sent', pdfOnly ? 'Issued as a PDF. Shared by the business directly.' : `${link.email ? `Emailed to ${link.email}` : 'Sent to the client portal'}${needsAccept ? ', waiting for their acceptance' : ''}`)
  audit(u.id, 'send', 'invoice', row.id)
  const message = pdfOnly ? `Hi ${link.name}, please find ${type.title.toLowerCase()} ${n.number} from ${biz.name} for ${inr(due)}, due ${shortDate(row.due)}, attached.` : `Hi ${link.name}, ${type.title.toLowerCase()} ${n.number} from ${biz.name} for ${inr(due)} is due ${shortDate(row.due)}. View it here: ${url}`
  return c.json({ number: n.number, message, phone: phoneOf(link) })
})

/* Cancel a sent invoice. It keeps its number (GST records need it) and is clearly stamped Void. */
invoices.post('/:id/void', async (c) => {
  const biz = need(c)
  const row = biz && invoiceOfBiz(biz.id, c.req.param('id'))
  if (!biz || !row) return fail(c, 404, 'ERR-INV-404', 'That invoice was not found.')
  if (row.status === 'draft') return fail(c, 409, 'ERR-INV-409', 'Delete a draft instead of voiding it.')
  if (['void', 'paid'].includes(row.status)) return fail(c, 409, 'ERR-INV-409', row.status === 'paid' ? 'A paid invoice cannot be voided. Issue a credit note instead.' : 'This invoice is already void.')
  const p = messageBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', 'Say briefly why it is being voided.')
  db.query("UPDATE invoices SET status = 'void', void_reason = ? WHERE id = ?").run(p.data.message, row.id)
  addEvent(row.id, 'change', `Voided: ${p.data.message}`)
  const link = db.query('SELECT * FROM links WHERE id = ?').get(row.link_id) as LinkRow
  await notifyAndMail(link.user_id, link.email, `${row.number} from ${biz.name} was cancelled`, `${biz.name} cancelled invoice ${row.number}. Reason: ${p.data.message}. You do not need to pay it.`, link.user_id ? `${env.APP_URL}/slip/invoices/${row.id}` : '')
  audit(c.get('user').id, 'void', 'invoice', row.id)
  return c.json({ ok: true })
})

invoices.get('/:id/pdf', async (c) => {
  const biz = need(c)
  const row = biz && invoiceOfBiz(biz.id, c.req.param('id'))
  if (!biz || !row) return fail(c, 404, 'ERR-INV-404', 'That invoice was not found.')
  try {
    const pdf = await renderPdf(row.id)
    return new Response(Buffer.from(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${(row.number ?? 'draft').replace(/[^\w.-]+/g, '-')}.pdf"`, 'Cache-Control': 'no-store' } })
  } catch (e) { console.error('ERR-PDF-500', e); return c.json({ code: 'ERR-PDF-500', message: 'We could not make the PDF just now. Please try again.' }, 500) }
})

invoices.post('/:id/whatsapp-sent', (c) => {
  const biz = need(c)
  const row = biz && invoiceOfBiz(biz.id, c.req.param('id'))
  if (!biz || !row) return fail(c, 404, 'ERR-INV-404', 'That invoice was not found.')
  addEvent(row.id, 'whatsapp', 'Shared on WhatsApp')
  return c.json({ ok: true })
})

invoices.post('/:id/payments', async (c) => {
  const u = c.get('user')
  const biz = need(c)
  const row = biz && invoiceOfBiz(biz.id, c.req.param('id'))
  if (!biz || !row) return fail(c, 404, 'ERR-INV-404', 'That invoice was not found.')
  if (row.status === 'draft') return fail(c, 409, 'ERR-INV-409', 'Send the invoice before recording a payment.')
  const p = paymentBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', 'Enter the amount you received.')
  const dto = invoiceDto(row, 'business')
  const inr = (n: number) => money(n, dto.extra.currency)
  if (row.status === 'void') return fail(c, 409, 'ERR-INV-409', 'This invoice is void.')
  if (p.data.kind !== 'refund' && p.data.amount > dto.totals.balance) return fail(c, 422, 'ERR-VAL-422', `That is more than the balance of ${inr(dto.totals.balance)}.`)
  if (p.data.kind === 'refund' && p.data.amount > dto.totals.paid) return fail(c, 422, 'ERR-VAL-422', `You can refund at most ${inr(dto.totals.paid)}.`)
  recordPayment(row, p.data.amount, p.data.method, p.data.ref, p.data.paidAt ?? nowIso(), 'confirmed', u.id, p.data.kind, p.data.note)
  await afterPayment(row.id, biz.name, p.data.amount, p.data.kind)
  return c.json({ ok: true })
})

export function recordPayment(row: any, amount: number, method: string, ref: string, paidAt: string, status: 'confirmed' | 'claimed', by: string, kind = 'payment', note = '') {
  const id = uid()
  db.query('INSERT INTO payments (id,invoice_id,amount,method,ref,paid_at,status,created_by,created_at,kind,note) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id, row.id, amount, method, ref, paidAt, status, by, nowIso(), kind, note)
  return id
}

/* Settle the status, tell the client, and email them a receipt. */
export async function afterPayment(invoiceId: string, bizName: string, amount: number, kind = 'payment') {
  const row = db.query('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as any
  const dto = invoiceDto(row, 'business')
  const inr = (n: number) => money(n, dto.extra.currency)
  const newStatus = dto.totals.balance <= 0 ? 'paid' : dto.totals.paid > 0 || dto.totals.advance > 0 ? 'partial' : 'sent'
  db.query('UPDATE invoices SET status = ? WHERE id = ?').run(newStatus, invoiceId)
  const label = ({ payment: 'Payment', advance: 'Advance', tds: 'TDS deducted', writeoff: 'Write-off', refund: 'Refund' } as Record<string, string>)[kind] ?? 'Payment'
  addEvent(invoiceId, 'payment', `${label} of ${inr(amount)} recorded`)
  if (newStatus === 'paid') addEvent(invoiceId, 'confirmed', 'Marked paid, receipt sent')
  const link = db.query('SELECT * FROM links WHERE id = ?').get(row.link_id) as LinkRow
  const body = newStatus === 'paid' ? `${bizName} received your payment of ${inr(amount)}. Invoice ${row.number} is paid in full. Thank you.` : `${bizName} received ${inr(amount)} toward invoice ${row.number}. Balance: ${inr(dto.totals.balance)}.`
  await notifyAndMail(link.user_id, link.email, newStatus === 'paid' ? `Receipt: ${row.number} is paid` : `Payment received for ${row.number}`, body, link.user_id ? `${env.APP_URL}/slip/invoices/${invoiceId}` : '')
}

/* Put the invoice status right after a payment changes, without telling the client again. */
function settle(invoiceId: string) {
  const row = db.query('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as any
  if (!row || ['draft', 'void'].includes(row.status)) return
  const dto = invoiceDto(row, 'business')
  const s = dto.totals.balance <= 0 ? 'paid' : dto.totals.paid > 0 || dto.totals.advance > 0 ? 'partial' : 'sent'
  db.query('UPDATE invoices SET status = ? WHERE id = ?').run(s, invoiceId)
}
type PayRow = { id: string; invoice_id: string; amount: number; method: string; ref: string; note: string; kind: string; paid_at: string; status: string }
const payOfBiz = (bizId: string, pid: string) => db.query(`SELECT p.* FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE p.id = ? AND i.business_id = ? AND p.status = 'confirmed'`).get(pid, bizId) as PayRow | null
const KIND_LABEL: Record<string, string> = { payment: 'Payment', advance: 'Advance', tds: 'TDS', writeoff: 'Write-off', refund: 'Refund' }
const METHOD_LABEL: Record<string, string> = { upi: 'UPI', bank: 'bank transfer', cash: 'cash', cheque: 'cheque', card: 'card', other: 'other' }

/* Fix a recorded payment. The old values go into the activity log, so nothing is lost. */
invoices.put('/payments/:pid', async (c) => {
  const u = c.get('user'), biz = need(c)
  const pay = biz && payOfBiz(biz.id, c.req.param('pid'))
  if (!biz || !pay) return fail(c, 404, 'ERR-PAY-404', 'That payment was not found.')
  const p = paymentEditBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', 'Check the amount and date, then try again.')
  const row = db.query('SELECT * FROM invoices WHERE id = ?').get(pay.invoice_id) as any
  if (row.status === 'void') return fail(c, 409, 'ERR-INV-409', 'This invoice is void.')
  const dto = invoiceDto(row, 'business')
  const inr = (n: number) => money(n, dto.extra.currency)
  const room = pay.kind === 'refund' ? dto.totals.paid + pay.amount : dto.totals.balance + pay.amount
  if (p.data.amount > room) return fail(c, 422, 'ERR-VAL-422', `That is more than the most this can be (${inr(room)}).`)
  const b = p.data, changes: string[] = []
  if (b.amount !== pay.amount) changes.push(`amount ${inr(pay.amount)} to ${inr(b.amount)}`)
  if (b.method !== pay.method) changes.push(`method ${METHOD_LABEL[pay.method] ?? pay.method} to ${METHOD_LABEL[b.method]}`)
  if (b.paidAt.slice(0, 10) !== pay.paid_at.slice(0, 10)) changes.push(`date ${shortDate(pay.paid_at)} to ${shortDate(b.paidAt)}`)
  if (b.ref !== pay.ref) changes.push('reference')
  if (b.note !== pay.note) changes.push('note')
  if (!changes.length) return c.json({ ok: true })
  db.query('UPDATE payments SET amount = ?, method = ?, ref = ?, note = ?, paid_at = ?, edited_at = ? WHERE id = ?').run(b.amount, b.method, b.ref, b.note, b.paidAt, nowIso(), pay.id)
  settle(pay.invoice_id)
  const label = KIND_LABEL[pay.kind] ?? 'Payment'
  addEvent(pay.invoice_id, 'payment_edit', `${label} corrected: ${changes.join(', ')}`)
  const link = db.query('SELECT user_id FROM links WHERE id = ?').get(row.link_id) as { user_id: string | null } | null
  if (b.amount !== pay.amount) notify(link?.user_id, `${label} corrected on ${row.number}`, `${biz.name} corrected a recorded ${label.toLowerCase()} from ${inr(pay.amount)} to ${inr(b.amount)}.`, `${env.APP_URL}/slip/invoices/${row.id}`)
  audit(u.id, 'edit-payment', 'payment', pay.id)
  return c.json({ ok: true })
})

/* Remove a recorded payment without erasing it: it stays on the record, struck through, with the reason. */
invoices.post('/payments/:pid/void', async (c) => {
  const u = c.get('user'), biz = need(c)
  const pay = biz && payOfBiz(biz.id, c.req.param('pid'))
  if (!biz || !pay) return fail(c, 404, 'ERR-PAY-404', 'That payment was not found.')
  const p = paymentVoidBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', 'That reason is too long.')
  const row = db.query('SELECT * FROM invoices WHERE id = ?').get(pay.invoice_id) as any
  if (row.status === 'void') return fail(c, 409, 'ERR-INV-409', 'This invoice is void.')
  db.query("UPDATE payments SET status = 'voided', voided_at = ?, void_reason = ? WHERE id = ?").run(nowIso(), p.data.reason, pay.id)
  settle(pay.invoice_id)
  const inr = (n: number) => money(n, invoiceDto(row, 'business').extra.currency)
  const label = KIND_LABEL[pay.kind] ?? 'Payment'
  addEvent(pay.invoice_id, 'payment_void', `${label} of ${inr(pay.amount)} removed${p.data.reason ? `: ${p.data.reason}` : ''}`)
  const link = db.query('SELECT user_id FROM links WHERE id = ?').get(row.link_id) as { user_id: string | null } | null
  notify(link?.user_id, `${label} removed on ${row.number}`, `${biz.name} removed a recorded ${label.toLowerCase()} of ${inr(pay.amount)}${p.data.reason ? `: ${p.data.reason}` : ''}.`, `${env.APP_URL}/slip/invoices/${row.id}`)
  audit(u.id, 'void-payment', 'payment', pay.id)
  return c.json({ ok: true })
})

invoices.post('/payments/:pid/confirm', async (c) => {
  const biz = need(c)
  const pay = biz && (db.query(`SELECT p.* FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE p.id = ? AND i.business_id = ? AND p.status = 'claimed'`).get(c.req.param('pid'), biz.id) as { id: string; invoice_id: string; amount: number } | null)
  if (!biz || !pay) return fail(c, 404, 'ERR-PAY-404', 'That payment was not found.')
  db.query("UPDATE payments SET status = 'confirmed' WHERE id = ?").run(pay.id)
  await afterPayment(pay.invoice_id, biz.name, pay.amount)
  return c.json({ ok: true })
})

invoices.post('/:id/remind', async (c) => {
  const biz = need(c)
  const row = biz && invoiceOfBiz(biz.id, c.req.param('id'))
  if (!biz || !row) return fail(c, 404, 'ERR-INV-404', 'That invoice was not found.')
  if (['draft', 'paid', 'void'].includes(row.status)) return fail(c, 409, 'ERR-INV-409', 'There is nothing to remind about on this invoice.')
  const dto = invoiceDto(row, 'business')
  const inr = (n: number) => money(n, dto.extra.currency)
  const link = db.query('SELECT * FROM links WHERE id = ?').get(row.link_id) as LinkRow
  await notifyAndMail(link.user_id, link.email, `Reminder: ${row.number} from ${biz.name}`, `A friendly reminder from ${biz.name}: ${inr(dto.totals.balance)} is due ${shortDate(row.due)} on invoice ${row.number}.`, link.user_id ? `${env.APP_URL}/slip/invoices/${row.id}` : '')
  addEvent(row.id, 'reminder', 'Reminder sent')
  return c.json({ ok: true })
})

invoices.get('/summary/all', (c) => {
  const biz = need(c)
  if (!biz) return c.json({ outstanding: 0, collected: 0, overdue: 0, drafts: 0, open: 0, attention: [], activity: [] })
  const rows = db.query(`SELECT i.*, l.name AS client_name, l.company AS client_company FROM invoices i JOIN links l ON l.id = i.link_id WHERE i.business_id = ? AND i.deleted_at IS NULL`).all(biz.id) as any[]
  let outstanding = 0, collected = 0, overdue = 0, drafts = 0, open = 0
  const attention: unknown[] = []
  let dueSoon = 0
  const weekAhead = Date.now() + 7 * 86_400_000
  for (const r of rows) {
    if (json<{ currency?: string }>(r.extra ?? '{}', {}).currency && json<{ currency?: string }>(r.extra ?? '{}', {}).currency !== 'INR') continue // money totals are in rupees
    const t = rowTotals(r)
    const paid = paidSum(r.id)
    const balance = r.status === 'void' ? 0 : Math.max(t.total - t.advance - paid, 0)
    const st = displayStatus(r, balance)
    if (st === 'draft' || st === 'void') { if (st === 'draft') drafts++; continue }
    collected += Math.min(paid + t.advance, t.total)
    if (balance > 0) { outstanding += balance; open++ }
    if (st === 'overdue') overdue++
    if (balance > 0 && st !== 'overdue' && new Date(r.due).getTime() <= weekAhead) dueSoon += balance
    if (['overdue', 'viewed', 'partial'].includes(st)) attention.push({ id: r.id, number: r.number, client: r.client_company || r.client_name, status: st, due: r.due, balance })
  }
  const activity = db.query(`SELECT e.kind,e.text,e.at,i.number,i.id AS invoiceId FROM events e JOIN invoices i ON i.id = e.invoice_id
    WHERE i.business_id = ? AND e.audience IN ('both','business') ORDER BY e.at DESC LIMIT 8`).all(biz.id)
  /* Average days from sending to the final confirmed payment, over paid invoices. */
  const paidRows = db.query(`SELECT i.sent_at, MAX(p.paid_at) AS last FROM invoices i JOIN payments p ON p.invoice_id = i.id AND p.status = 'confirmed'
    WHERE i.business_id = ? AND i.status = 'paid' AND i.sent_at IS NOT NULL GROUP BY i.id`).all(biz.id) as { sent_at: string; last: string }[]
  const avgDaysToPaid = paidRows.length ? Math.round(paidRows.reduce((n, r) => n + Math.max(0, new Date(r.last).getTime() - new Date(r.sent_at).getTime()), 0) / paidRows.length / 86_400_000) : null
  return c.json({ outstanding, collected, overdue, drafts, open, attention, activity, dueSoon, avgDaysToPaid })
})

/* Remembers what you bill for: past line items with the last rate used, most frequent first. */
invoices.get('/items/suggest', (c) => {
  const biz = need(c)
  if (!biz) return c.json([])
  const rows = db.query('SELECT items, created_at FROM invoices WHERE business_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 300').all(biz.id) as { items: string }[]
  const seen = new Map<string, { desc: string; rate: number; qty: number; uses: number }>()
  for (const r of rows) for (const i of json<Item[]>(r.items, [])) {
    const key = i.desc.trim().toLowerCase()
    if (!key) continue
    const s = seen.get(key)
    if (s) s.uses++
    else seen.set(key, { desc: i.desc.trim(), rate: i.rate, qty: i.qty, uses: 1 })
  }
  return c.json([...seen.values()].sort((a, b) => b.uses - a.uses).slice(0, 60))
})

/* Start a new draft from any invoice: same client, items, terms and look; fresh dates and no number. */
invoices.post('/:id/duplicate', (c) => {
  const biz = need(c)
  const row = biz && invoiceOfBiz(biz.id, c.req.param('id'))
  if (!biz || !row) return fail(c, 404, 'ERR-INV-404', 'That invoice was not found.')
  const id = uid()
  /* ?as=invoice turns a quotation into the first non-quotation type, and remembers where it came from. */
  const target = c.req.query('as') === 'invoice' ? (db.query('SELECT id,schema FROM invoice_types WHERE business_id = ? AND archived = 0 ORDER BY created_at').all(biz.id) as { id: string; schema: string }[]).find((t) => !isQuote(t.schema)) : null
  const span = Math.max(0, new Date(row.due).getTime() - new Date(row.issued).getTime())
  const now = new Date()
  db.query(`INSERT INTO invoices (id,business_id,link_id,type_id,type_snapshot,theme,bill_to,items,fields,gst_pct,discount,advance,issued,due,note,project,terms,tax_inclusive,extra,status,created_at,source_id)
    SELECT ?,business_id,link_id,COALESCE(?,type_id),COALESCE(?,type_snapshot),theme,bill_to,items,fields,gst_pct,discount,0,?,?,note,project,terms,tax_inclusive,extra,'draft',?,? FROM invoices WHERE id = ?`)
    .run(id, target?.id ?? null, target?.schema ?? null, now.toISOString(), new Date(now.getTime() + span).toISOString(), nowIso(), row.id, row.id)
  addEvent(id, 'created', `Draft created from ${row.number ?? 'a draft'}`, 'business')
  return c.json({ id })
})
