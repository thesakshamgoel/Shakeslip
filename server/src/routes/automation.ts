import { Hono } from 'hono'
import { bizOf, invoiceOfBiz, paidSum, rowTotals } from '../access.ts'
import { requireUser, type Vars } from '../auth.ts'
import { automationOf, lateFeeFor } from '../automation.ts'
import { db, nowIso, uid } from '../db.ts'
import { addEvent } from '../notify.ts'
import { automationBody } from '../schemas.ts'
import { fail } from '../security.ts'

export const automation = new Hono<{ Variables: Vars }>()
automation.use('*', requireUser)

const bizRow = (c: any) => { const b = bizOf(c.get('user').id); return b ? (db.query('SELECT id, automation FROM businesses WHERE id = ?').get(b.id) as { id: string; automation: string }) : null }

automation.get('/', (c) => {
  const b = bizRow(c)
  return b ? c.json(automationOf(b.automation)) : fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
})

automation.put('/', async (c) => {
  const b = bizRow(c)
  if (!b) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = automationBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  db.query('UPDATE businesses SET automation = ? WHERE id = ?').run(JSON.stringify(p.data), b.id)
  return c.json({ ok: true })
})

function feeOf(bizId: string, auto: string, id: string) {
  const row = invoiceOfBiz(bizId, id)
  if (!row || ['draft', 'void', 'paid'].includes(row.status)) return { row, amount: 0 }
  const t = rowTotals(row)
  const balance = Math.max(t.total - t.advance - paidSum(row.id), 0)
  return { row, amount: lateFeeFor(automationOf(auto).lateFee, balance, row.due) }
}

automation.get('/late-fee/:id', (c) => {
  const b = bizRow(c)
  if (!b) return c.json({ amount: 0 })
  return c.json({ amount: feeOf(b.id, b.automation, c.req.param('id')).amount })
})

/* A sent invoice is never changed. The late fee goes on a new draft for the same client, ready to check and send. */
automation.post('/late-fee/:id', (c) => {
  const b = bizRow(c)
  if (!b) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const { row, amount } = feeOf(b.id, b.automation, c.req.param('id'))
  if (!row) return fail(c, 404, 'ERR-INV-404', 'That invoice was not found.')
  if (!amount) return fail(c, 422, 'ERR-FEE-422', 'No late fee is due on this invoice.')
  const id = uid(), now = new Date()
  const items = JSON.stringify([{ id: uid(), desc: `Late payment fee on ${row.number}`, qty: 1, rate: amount }])
  db.query(`INSERT INTO invoices (id,business_id,link_id,type_id,type_snapshot,theme,bill_to,items,fields,gst_pct,discount,advance,issued,due,note,project,terms,tax_inclusive,extra,status,created_at,source_id)
    SELECT ?,business_id,link_id,type_id,type_snapshot,theme,bill_to,?,fields,gst_pct,0,0,?,?,?,project,terms,0,'{}','draft',?,? FROM invoices WHERE id = ?`)
    .run(id, items, now.toISOString(), new Date(now.getTime() + 7 * 86_400_000).toISOString(), `Late payment fee as per the terms of ${row.number}.`, nowIso(), row.id, row.id)
  addEvent(id, 'created', `Late fee draft for ${row.number}`, 'business')
  return c.json({ id, amount })
})
