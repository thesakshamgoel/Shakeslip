import { Hono } from 'hono'
import { syncShared } from '../shared.ts'
import { bizOf } from '../access.ts'
import { requireUser, type Vars } from '../auth.ts'
import { audit, db, nowIso, uid } from '../db.ts'
import { documentTemplateBody, businessBody, catalogueBody, defaultsBody, groupBody, logoBody, emailsBody, phonesBody, qrBody, signatureBody, typeSchema } from '../schemas.ts'
import { seedBusiness } from '../seed.ts'
import { fail } from '../security.ts'
import { json, token } from '../util.ts'

export const business = new Hono<{ Variables: Vars }>()
export function refreshCode(b: { id: string; name: string; slug_at: string }) {
  if (b.slug_at && Date.now() - new Date(b.slug_at).getTime() <= 86_400_000) return
  db.query('UPDATE businesses SET slug = ?, slug_at = ? WHERE id = ?').run(newSlug(b.name), nowIso(), b.id)
}
business.use('*', requireUser)

const slugify = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'studio'
const newSlug = (n: string) => `${slugify(n)}-${token(3).toLowerCase().replace(/[^a-z0-9]/g, 'x').slice(0, 4)}`

business.post('/', async (c) => {
  const u = c.get('user')
  if (bizOf(u.id)) return fail(c, 409, 'ERR-BIZ-409', 'You already have a Studio. Open it from the menu.')
  const p = businessBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  const b = p.data
  /* details already given as a client carry over, so nothing is asked twice */
  const mine = db.query('SELECT gstin,address,area,pin,city,state,pan FROM client_profiles WHERE user_id = ?').get(u.id) as Record<string, string> | null
  for (const k of ['gstin', 'address', 'area', 'pin', 'city', 'state', 'pan'] as const) if (!b[k] && mine?.[k]) b[k] = mine[k]
  if (!b.phone) b.phone = (db.query('SELECT phone FROM users WHERE id = ?').get(u.id) as { phone: string } | null)?.phone ?? ''
  const id = uid()
  db.query('INSERT INTO businesses (id,owner_id,name,slug,gstin,address,area,pin,city,email,phone,state,profession,pan,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, u.id, b.name, newSlug(b.name), b.gstin, b.address, b.area, b.pin, b.city, b.email || u.email, b.phone, b.gstin ? b.gstin.slice(0, 2) : b.state, b.profession, b.pan, nowIso())
  seedBusiness(id)
  syncShared(u.id)
  audit(u.id, 'create', 'business', id)
  return c.json({ ok: true })
})

business.put('/', async (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = businessBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  const b = p.data
  db.query(`UPDATE businesses SET name=?,gstin=?,address=?,area=?,pin=?,city=?,email=?,phone=?,auto_approve=?,pan=?,website=?,state=?,upi_id=?,bank_name=?,account_name=?,account_no=?,ifsc=?,profession=? WHERE id=?`)
    .run(b.name, b.gstin, b.address, b.area, b.pin, b.city, b.email, b.phone, b.autoApprove ? 1 : 0, b.pan, b.website, b.gstin ? b.gstin.slice(0, 2) : b.state, b.upiId, b.bankName, b.accountName, b.accountNo, b.ifsc, b.profession, biz.id)
  syncShared(c.get('user').id)
  return c.json({ ok: true })
})

business.put('/logo', async (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = logoBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  db.query('UPDATE businesses SET logo = ?, logo_size = ? WHERE id = ?').run(p.data.image, p.data.size, biz.id)
  return c.json({ ok: true })
})

/* Payment phone numbers: several, each labelled; one is the default printed on invoices. */
business.put('/phones', async (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = phonesBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  const list = p.data.phones.map((x, i, all) => ({ ...x, isDefault: all.some((y) => y.isDefault) ? x.isDefault : i === 0 }))
  db.query('UPDATE businesses SET phones = ? WHERE id = ?').run(JSON.stringify(list), biz.id)
  return c.json({ ok: true })
})

/* Contact emails: several, each labelled. */
business.put('/emails', async (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = emailsBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  const list = p.data.emails.map((x, i, all) => ({ ...x, isDefault: all.some((y) => y.isDefault) ? x.isDefault : i === 0 }))
  db.query('UPDATE businesses SET emails = ? WHERE id = ?').run(JSON.stringify(list), biz.id)
  return c.json({ ok: true })
})

/* Services with set rates, and packages that bundle them at one price. A package may only include your own services. */
business.put('/catalogue', async (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = catalogueBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  const ids = new Set(p.data.services.map((x) => x.id))
  const packages = p.data.packages.map((k) => ({ ...k, includes: k.includes.filter((i) => ids.has(i)) }))
  db.query('UPDATE businesses SET catalogue = ? WHERE id = ?').run(JSON.stringify({ services: p.data.services, packages }), biz.id)
  return c.json({ ok: true })
})

/* Your own payment QR image (for example from your bank app), used instead of the generated UPI QR when chosen. */
business.put('/qr', async (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = qrBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  db.query('UPDATE businesses SET qr_image = ? WHERE id = ?').run(p.data.image, biz.id)
  return c.json({ ok: true })
})

/* Defaults for every new invoice: design and terms. */
business.put('/defaults', async (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = defaultsBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  db.query('UPDATE businesses SET default_theme = ?, default_layout = ?, default_terms = ?, default_custom_terms = ? WHERE id = ?').run(p.data.theme, p.data.layout, JSON.stringify(p.data.terms.filter(Boolean)), p.data.customTerms, biz.id)
  return c.json({ ok: true })
})

business.put('/signature', async (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = signatureBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  db.query('UPDATE businesses SET signature = ? WHERE id = ?').run(JSON.stringify(p.data), biz.id)
  return c.json({ ok: true })
})

business.post('/rotate-code', (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  db.query('UPDATE businesses SET slug = ?, slug_at = ? WHERE id = ?').run(newSlug(biz.name), nowIso(), biz.id)
  return c.json({ ok: true })
})

/* ---- invoice types ---- */
business.get('/types', (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return c.json([])
  const rows = db.query('SELECT id,name,schema FROM invoice_types WHERE business_id = ? AND archived = 0 ORDER BY created_at').all(biz.id) as { id: string; name: string; schema: string }[]
  return c.json(rows.map((r) => ({ id: r.id, ...json(r.schema, {}) })))
})
business.post('/types', async (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = typeSchema.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  const id = uid()
  db.query('INSERT INTO invoice_types (id,business_id,name,schema,archived,created_at) VALUES (?,?,?,?,0,?)').run(id, biz.id, p.data.name, JSON.stringify(p.data), nowIso())
  return c.json({ id })
})
business.put('/types/:id', async (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = typeSchema.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  const r = db.query('UPDATE invoice_types SET name = ?, schema = ? WHERE id = ? AND business_id = ?').run(p.data.name, JSON.stringify(p.data), c.req.param('id'), biz.id)
  return r.changes ? c.json({ ok: true }) : fail(c, 404, 'ERR-TYPE-404', 'That invoice type was not found.')
})
/* Archive, never hard delete: sent invoices keep their own snapshot of the type. */
business.delete('/types/:id', (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  db.query('UPDATE invoice_types SET archived = 1 WHERE id = ? AND business_id = ?').run(c.req.param('id'), biz.id)
  return c.json({ ok: true })
})

/* ---- client groups ---- */
business.get('/groups', (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return c.json([])
  const rows = db.query(`SELECT g.id,g.name,g.type_id AS typeId,g.theme,g.due_days AS dueDays,g.reminders,
    (SELECT COUNT(*) FROM links l WHERE l.group_id = g.id AND l.deleted_at IS NULL AND l.status != 'ended') AS clients
    FROM groups g WHERE g.business_id = ? AND g.deleted_at IS NULL ORDER BY g.created_at`).all(biz.id) as any[]
  return c.json(rows.map((r) => ({ ...r, reminders: json(r.reminders, {}) })))
})
business.post('/groups', async (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = groupBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  const g = p.data
  if (g.typeId && !db.query('SELECT 1 FROM invoice_types WHERE id = ? AND business_id = ?').get(g.typeId, biz.id)) return fail(c, 422, 'ERR-VAL-422', 'Pick one of your own invoice types.')
  const id = uid()
  db.query('INSERT INTO groups (id,business_id,name,type_id,theme,due_days,reminders,created_at) VALUES (?,?,?,?,?,?,?,?)').run(id, biz.id, g.name, g.typeId, g.theme, g.dueDays, JSON.stringify(g.reminders), nowIso())
  return c.json({ id })
})
business.put('/groups/:id', async (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = groupBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  const g = p.data
  const r = db.query('UPDATE groups SET name=?,type_id=?,theme=?,due_days=?,reminders=? WHERE id=? AND business_id=? AND deleted_at IS NULL').run(g.name, g.typeId, g.theme, g.dueDays, JSON.stringify(g.reminders), c.req.param('id'), biz.id)
  return r.changes ? c.json({ ok: true }) : fail(c, 404, 'ERR-GRP-404', 'That group was not found.')
})
business.delete('/groups/:id', (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const id = c.req.param('id')
  db.query('UPDATE links SET group_id = NULL WHERE group_id = ? AND business_id = ?').run(id, biz.id)
  db.query('UPDATE groups SET deleted_at = ? WHERE id = ? AND business_id = ?').run(nowIso(), id, biz.id)
  return c.json({ ok: true })
})

business.get('/document-templates', (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  return c.json(db.query('SELECT id,name,kind,content FROM document_templates WHERE business_id = ? ORDER BY created_at DESC').all(biz.id))
})
business.post('/document-templates', async (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = documentTemplateBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', 'Give the template a name and some text, within the document limit.')
  const count = db.query('SELECT COUNT(*) AS n FROM document_templates WHERE business_id = ?').get(biz.id) as { n: number }
  if (count.n >= 50) return fail(c, 422, 'ERR-VAL-422', 'You have 50 templates. Remove one before saving another.')
  const id = uid(), b = p.data
  db.query('INSERT INTO document_templates (id,business_id,name,kind,content,created_at) VALUES (?,?,?,?,?,?)').run(id, biz.id, b.name, b.kind, b.content, nowIso())
  return c.json({ id })
})
business.delete('/document-templates/:id', (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  db.query('DELETE FROM document_templates WHERE id = ? AND business_id = ?').run(c.req.param('id'), biz.id)
  return c.json({ ok: true })
})
