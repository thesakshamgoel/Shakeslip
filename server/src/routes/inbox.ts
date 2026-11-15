import { Hono } from 'hono'
import { displayStatus, invoiceDto, invoiceOfClient, paidSum, rowTotals } from '../access.ts'
import { requireUser, type Vars } from '../auth.ts'
import { db, nowIso, uid } from '../db.ts'
import { addEvent, notify } from '../notify.ts'
import { acceptBody, changeBody, claimBody } from '../schemas.ts'
import { fail } from '../security.ts'
import { inr, json } from '../util.ts'
import { extraSchema } from '../schemas.ts'
import { recordPayment } from './invoices.ts'
import { renderPdf } from '../pdf.ts'

/* The client side (Slip). Every query is scoped to links owned by the signed-in user. */
export const inbox = new Hono<{ Variables: Vars }>()
inbox.use('*', requireUser)

function bizOwner(bizId: string) { return db.query('SELECT owner_id,name FROM businesses WHERE id = ?').get(bizId) as { owner_id: string; name: string } }

inbox.get('/', (c) => {
  const rows = db.query(`SELECT i.*, b.name AS biz_name FROM invoices i JOIN links l ON l.id = i.link_id JOIN businesses b ON b.id = i.business_id
    WHERE l.user_id = ? AND l.status = 'active' AND l.deleted_at IS NULL AND i.deleted_at IS NULL AND i.status != 'draft' AND i.delivery != 'pdf' ORDER BY i.sent_at DESC`).all(c.get('user').id) as any[]
  return c.json(rows.map((r) => {
    const t = rowTotals(r)
    const balance = r.status === 'void' ? 0 : Math.max(t.total - t.advance - paidSum(r.id), 0)
    return { id: r.id, number: r.number, from: r.biz_name, status: displayStatus(r, balance), due: r.due, issued: r.issued, total: t.total, balance, currency: extraSchema.parse(json(r.extra ?? '{}', {})).currency }
  }))
})

inbox.get('/:id', (c) => {
  const row = invoiceOfClient(c.get('user').id, c.req.param('id'))
  if (!row) return fail(c, 404, 'ERR-INV-404', 'We could not find that invoice. It may have been withdrawn.')
  if (!row.viewed_at) {
    db.query('UPDATE invoices SET viewed_at = ?, status = CASE WHEN status = ? THEN ? ELSE status END WHERE id = ?').run(nowIso(), 'sent', 'viewed', row.id)
    const o = bizOwner(row.business_id)
    addEvent(row.id, 'viewed', `Viewed by ${c.get('user').name}`)
    notify(o.owner_id, `${c.get('user').name} opened ${row.number}`, 'Your invoice has been seen.', `/studio/invoices/${row.id}`)
  }
  return c.json(invoiceDto(invoiceOfClient(c.get('user').id, row.id)!, 'client'))
})

inbox.get('/:id/pdf', async (c) => {
  const row = invoiceOfClient(c.get('user').id, c.req.param('id'))
  if (!row) return fail(c, 404, 'ERR-INV-404', 'We could not find that invoice.')
  try {
    const pdf = await renderPdf(row.id)
    return new Response(Buffer.from(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${(row.number ?? 'invoice').replace(/[^\w.-]+/g, '-')}.pdf"`, 'Cache-Control': 'no-store' } })
  } catch (e) { console.error('ERR-PDF-500', e); return c.json({ code: 'ERR-PDF-500', message: 'We could not make the PDF just now. Please try again.' }, 500) }
})

inbox.post('/:id/claim', async (c) => {
  const u = c.get('user')
  const row = invoiceOfClient(u.id, c.req.param('id'))
  if (!row) return fail(c, 404, 'ERR-INV-404', 'We could not find that invoice.')
  const p = claimBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', 'Enter the amount you paid.')
  const dto = invoiceDto(row, 'client')
  if (dto.totals.balance <= 0) return fail(c, 409, 'ERR-INV-409', 'This invoice is already paid in full.')
  if (p.data.amount > dto.totals.balance) return fail(c, 422, 'ERR-VAL-422', `That is more than the balance of ${inr(dto.totals.balance)}.`)
  recordPayment(row, p.data.amount, p.data.method, p.data.ref, nowIso(), 'claimed', u.id)
  const o = bizOwner(row.business_id)
  const how = ({ upi: 'by UPI', card: 'by card', cash: 'in cash', bank: 'by bank transfer', cheque: 'by cheque', other: '' } as Record<string, string>)[p.data.method]
  addEvent(row.id, 'claimed', `${u.name} says they paid ${inr(p.data.amount)}${how ? ` ${how}` : ''}. Waiting for ${o.name} to confirm.`)
  notify(o.owner_id, `${u.name} says they paid`, `${inr(p.data.amount)}${how ? ` ${how}` : ''} on ${row.number}${p.data.ref ? `, ref ${p.data.ref}` : ''}. Confirm it once it reaches you.`, `/studio/invoices/${row.id}`)
  return c.json({ ok: true })
})

inbox.post('/:id/confirm-details', (c) => {
  const u = c.get('user')
  const row = invoiceOfClient(u.id, c.req.param('id'))
  if (!row) return fail(c, 404, 'ERR-INV-404', 'We could not find that invoice.')
  const o = bizOwner(row.business_id)
  addEvent(row.id, 'details', `${u.name} confirmed the billing details are correct`)
  notify(o.owner_id, `${u.name} confirmed their details`, `Billing details on ${row.number} are confirmed.`, `/studio/invoices/${row.id}`)
  return c.json({ ok: true })
})

inbox.post('/:id/request-change', async (c) => {
  const u = c.get('user')
  const row = invoiceOfClient(u.id, c.req.param('id'))
  if (!row) return fail(c, 404, 'ERR-INV-404', 'We could not find that invoice.')
  const p = changeBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  const o = bizOwner(row.business_id)
  for (const m of p.data.pins) db.query('INSERT INTO annotations (id,invoice_id,page,x,y,text,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)').run(uid(), row.id, m.page, m.x, m.y, m.text, u.id, nowIso())
  const marks = p.data.pins.length ? ` (${p.data.pins.length} ${p.data.pins.length === 1 ? 'mark' : 'marks'} on the invoice)` : ''
  const said = p.data.message || p.data.pins.map((m, i) => `${i + 1}. ${m.text}`).join(' ')
  addEvent(row.id, 'change', `${u.name} asked for a change: ${said}${p.data.message ? marks : ''}`)
  notify(o.owner_id, `${u.name} asked for a change`, `${said}${marks && p.data.message ? marks : ''}`.slice(0, 300), `/studio/invoices/${row.id}`)
  return c.json({ ok: true })
})

/* The client signs to accept, only when the business asked for it. Both sides are told. */
inbox.post('/:id/accept', async (c) => {
  const u = c.get('user')
  const row = invoiceOfClient(u.id, c.req.param('id'))
  if (!row) return fail(c, 404, 'ERR-INV-404', 'We could not find that invoice.')
  if (!row.needs_accept) return fail(c, 409, 'ERR-INV-409', 'This invoice does not need to be accepted.')
  if (row.accepted_at) return fail(c, 409, 'ERR-INV-409', 'You have already accepted this invoice.')
  if (row.status === 'void') return fail(c, 409, 'ERR-INV-409', 'This invoice was cancelled.')
  const p = acceptBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  db.query('UPDATE invoices SET accepted_at = ?, accepted_name = ?, accepted_sig = ? WHERE id = ?').run(nowIso(), p.data.name, p.data.signature ?? '', row.id)
  const o = bizOwner(row.business_id)
  addEvent(row.id, 'accepted', `${p.data.name} accepted and signed ${row.number}`)
  notify(o.owner_id, `${p.data.name} accepted ${row.number}`, 'They signed it in Slip. The signature is on the invoice.', `/studio/invoices/${row.id}`)
  notify(u.id, `You accepted ${row.number}`, `${o.name} has been told. The signed copy stays in your inbox.`, `/slip/invoices/${row.id}`)
  return c.json({ ok: true })
})
