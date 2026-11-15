import { Hono } from 'hono'
import { bizOf, invoiceDto } from '../access.ts'
import { checkPrintToken } from '../pdf.ts'
import { currentUser, requireUser, type Vars } from '../auth.ts'
import { audit, db, nowIso, uid } from '../db.ts'
import { env } from '../env.ts'
import { notify, notifyAndMail } from '../notify.ts'
import { codeBody, inviteBody, linkPatch } from '../schemas.ts'
import { fail } from '../security.ts'
import { maskEmail, sha256, token } from '../util.ts'

/* connect codes refresh every 24 hours */
export const codeExpired = (at: string) => !!at && Date.now() - new Date(at).getTime() > 86_400_000

type Link = { id: string; business_id: string; group_id: string | null; user_id: string | null; name: string; email: string; phone: string; status: string; invite_expires: string | null }
const INVITE_DAYS = 1 // invite links work for 24 hours
const inviteUrl = (t: string) => `${env.APP_URL}/join/${t}`

/* ---------- Studio side: manage the people you invoice ---------- */
export const studioLinks = new Hono<{ Variables: Vars }>()
studioLinks.use('*', requireUser)

studioLinks.get('/', (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return c.json([])
  /* the client's own profile wins over what the business typed, same as on invoices; so does their own phone number */
  const rows = db.query(`SELECT l.id,l.name,l.email,COALESCE(NULLIF(u.phone, ''), l.phone) AS phone,l.attention,COALESCE(NULLIF(cp.company, ''), l.company) AS company,COALESCE(NULLIF(cp.gstin, ''), l.gstin) AS gstin,COALESCE(NULLIF(cp.city, ''), l.city) AS city,COALESCE(NULLIF(cp.address, ''), l.address) AS address,COALESCE(NULLIF(cp.state, ''), l.state) AS state,COALESCE(NULLIF(cp.honorific, ''), l.honorific) AS honorific,COALESCE(NULLIF(cp.area, ''), l.area) AS area,COALESCE(NULLIF(cp.pin, ''), l.pin) AS pin,COALESCE(NULLIF(cp.pan, ''), l.pan) AS pan,COALESCE(NULLIF(cp.logo, ''), l.logo) AS logo,
    l.group_id AS groupId,l.status,(l.user_id IS NOT NULL) AS joined,
    (SELECT COUNT(*) FROM invoices i WHERE i.link_id = l.id AND i.deleted_at IS NULL) AS invoices
    FROM links l LEFT JOIN client_profiles cp ON cp.user_id = l.user_id LEFT JOIN users u ON u.id = l.user_id WHERE l.business_id = ? AND l.deleted_at IS NULL AND l.status != 'ended' ORDER BY l.created_at DESC`).all(biz.id)
  return c.json(rows)
})

function issueInvite(link: Link, biz: { name: string }) {
  const t = token(24)
  db.query('UPDATE links SET invite_hash = ?, invite_expires = ? WHERE id = ?').run(sha256(t), new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString(), link.id)
  const url = inviteUrl(t)
  const message = `Hi ${link.name}, ${biz.name} would like to send your invoices through Shakeslip. Connect here: ${url}`
  return { url, message }
}

studioLinks.post('/invite', async (c) => {
  const u = c.get('user')
  const biz = bizOf(u.id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = inviteBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  const b = p.data
  if (b.groupId && !db.query('SELECT 1 FROM groups WHERE id = ? AND business_id = ? AND deleted_at IS NULL').get(b.groupId, biz.id)) return fail(c, 422, 'ERR-VAL-422', 'Pick one of your own groups.')
  let link = b.email ? (db.query("SELECT * FROM links WHERE business_id = ? AND email = ? AND deleted_at IS NULL AND status != 'ended'").get(biz.id, b.email) as Link | null) : null
  if (link?.status === 'active') return fail(c, 409, 'ERR-LINK-409', `${link.name} is already connected to you.`)
  if (!link) {
    const id = uid()
    db.query("INSERT INTO links (id,business_id,group_id,name,email,phone,company,gstin,state,honorific,attention,address,area,city,pin,pan,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'invited',?)")
      .run(id, biz.id, b.groupId, b.name, b.email, b.phone, b.company, b.gstin, b.gstin ? b.gstin.slice(0, 2) : b.state, b.honorific, b.attention, b.address, b.area, b.city, b.pin, b.pan, nowIso())
    link = db.query('SELECT * FROM links WHERE id = ?').get(id) as Link
  }
  const { url, message } = issueInvite(link, biz)
  if (b.email) {
    const existing = db.query('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL').get(b.email) as { id: string } | null
    await notifyAndMail(existing?.id, b.email, `${biz.name} invited you to Shakeslip`, `${biz.name} would like to send you invoices through Shakeslip. Accept to see them in one place and get automatic updates.`, url)
  }
  audit(u.id, 'invite', 'link', link.id)
  return c.json({ id: link.id, inviteUrl: url, message, emailed: !!b.email })
})

studioLinks.post('/:id/resend', async (c) => {
  const biz = bizOf(c.get('user').id)
  const link = biz && (db.query("SELECT * FROM links WHERE id = ? AND business_id = ? AND deleted_at IS NULL AND status = 'invited'").get(c.req.param('id'), biz.id) as Link | null)
  if (!biz || !link) return fail(c, 404, 'ERR-LINK-404', 'That invite was not found, or it was already accepted.')
  const { url, message } = issueInvite(link, biz)
  if (link.email) await notifyAndMail(null, link.email, `${biz.name} invited you to Shakeslip`, `A reminder: ${biz.name} would like to send you invoices through Shakeslip.`, url)
  return c.json({ inviteUrl: url, message })
})

studioLinks.patch('/:id', async (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  const p = linkPatch.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  const link = db.query('SELECT * FROM links WHERE id = ? AND business_id = ? AND deleted_at IS NULL').get(c.req.param('id'), biz.id) as Link | null
  if (!link) return fail(c, 404, 'ERR-LINK-404', 'That client was not found.')
  const v = p.data
  if (v.groupId && !db.query('SELECT 1 FROM groups WHERE id = ? AND business_id = ? AND deleted_at IS NULL').get(v.groupId, biz.id)) return fail(c, 422, 'ERR-VAL-422', 'Pick one of your own groups.')
  for (const [col, val] of [['group_id', v.groupId], ['name', v.name], ['company', v.company], ['gstin', v.gstin], ['city', v.city], ['address', v.address], ['state', v.gstin ? v.gstin.slice(0, 2) : v.state],
    ['honorific', v.honorific], ['attention', v.attention], ['area', v.area], ['pin', v.pin], ['pan', v.pan], ['logo', v.logo], ['email', v.email], ['phone', v.phone]] as const)
    if (val !== undefined) db.query(`UPDATE links SET ${col} = ? WHERE id = ?`).run(val, link.id)
  return c.json({ ok: true })
})

studioLinks.post('/:id/:action{approve|decline}', (c) => {
  const biz = bizOf(c.get('user').id)
  const link = biz && (db.query("SELECT * FROM links WHERE id = ? AND business_id = ? AND status = 'pending' AND deleted_at IS NULL").get(c.req.param('id'), biz.id) as Link | null)
  if (!biz || !link) return fail(c, 404, 'ERR-LINK-404', 'That request was not found.')
  const ok = c.req.param('action') === 'approve'
  db.query('UPDATE links SET status = ? WHERE id = ?').run(ok ? 'active' : 'ended', link.id)
  notify(link.user_id, ok ? `${biz.name} accepted your request` : `${biz.name} declined your request`, ok ? 'You will see their invoices in your inbox.' : 'You can ask them to send you an invite instead.', '/slip')
  return c.json({ ok: true })
})

studioLinks.delete('/:id', (c) => {
  const biz = bizOf(c.get('user').id)
  if (!biz) return fail(c, 404, 'ERR-BIZ-404', 'Set up your Studio first.')
  db.query("UPDATE links SET status = 'ended', deleted_at = ? WHERE id = ? AND business_id = ?").run(nowIso(), c.req.param('id'), biz.id)
  return c.json({ ok: true })
})

/* ---------- Public: open an invite link or a business's connect page ---------- */
export const publicLinks = new Hono<{ Variables: Vars }>()

/* The print-only page fetches the invoice with the short signed token from pdf.ts. */
publicLinks.get('/print/:id', (c) => {
  const id = c.req.param('id')
  if (!checkPrintToken(id, c.req.query('t') ?? '')) return fail(c, 403, 'ERR-PRT-403', 'This print link has expired.')
  const row = db.query('SELECT * FROM invoices WHERE id = ? AND deleted_at IS NULL').get(id)
  return row ? c.json(invoiceDto(row as Record<string, unknown>, 'client')) : fail(c, 404, 'ERR-INV-404', 'Not found.')
})

publicLinks.get('/join/:token', (c) => {
  const row = db.query(`SELECT l.name,l.email,b.name AS business,b.city FROM links l JOIN businesses b ON b.id = l.business_id
    WHERE l.invite_hash = ? AND l.invite_expires > ? AND l.status = 'invited' AND l.deleted_at IS NULL`).get(sha256(c.req.param('token')), nowIso()) as { name: string; email: string; business: string; city: string } | null
  if (!row) return fail(c, 404, 'ERR-INV-404', 'This invite link has expired or was already used. Ask the business to send a new one.')
  return c.json({ business: { name: row.business, city: row.city }, name: row.name, emailHint: row.email ? maskEmail(row.email) : '' })
})

publicLinks.post('/join/:token', requireUser, (c) => {
  const u = c.get('user')
  const link = db.query("SELECT * FROM links WHERE invite_hash = ? AND invite_expires > ? AND status = 'invited' AND deleted_at IS NULL").get(sha256(c.req.param('token')), nowIso()) as Link | null
  if (!link) return fail(c, 404, 'ERR-INV-404', 'This invite link has expired or was already used. Ask the business to send a new one.')
  if (link.email && link.email.toLowerCase() !== u.email.toLowerCase()) return fail(c, 403, 'ERR-INV-403', `This invite was sent to ${maskEmail(link.email)}. Sign in with that email, or ask the business for a new invite.`)
  if (db.query("SELECT 1 FROM links WHERE business_id = ? AND user_id = ? AND deleted_at IS NULL AND status IN ('active','pending')").get(link.business_id, u.id)) return fail(c, 409, 'ERR-LINK-409', 'You are already connected to this business.')
  db.query("UPDATE links SET user_id = ?, status = 'active', invite_hash = NULL, invite_expires = NULL WHERE id = ?").run(u.id, link.id)
  const biz = db.query('SELECT owner_id,name FROM businesses WHERE id = ?').get(link.business_id) as { owner_id: string; name: string }
  notify(biz.owner_id, `${u.name} joined`, `${u.name} accepted your invite. Their invoices now reach them automatically.`, '/studio/clients')
  audit(u.id, 'accept-invite', 'link', link.id)
  return c.json({ ok: true, business: biz.name })
})

function findBusiness(slug: string) {
  const biz = db.query('SELECT id,owner_id,name,auto_approve,slug_at FROM businesses WHERE slug = ? COLLATE NOCASE').get(slug) as { id: string; owner_id: string; name: string; auto_approve: number; slug_at: string } | null
  if (biz && codeExpired(biz.slug_at)) return null
  return biz
}

publicLinks.get('/connect/:slug', (c) => {
  const biz = db.query('SELECT name,city,slug_at FROM businesses WHERE slug = ? COLLATE NOCASE').get(c.req.param('slug')) as { name: string; city: string; slug_at: string } | null
  if (!biz || codeExpired(biz.slug_at)) return fail(c, 404, 'ERR-BIZ-404', 'This code has expired or does not exist. Connect codes refresh every 24 hours; ask the business for their current one.')
  return c.json({ business: biz, viewerSignedIn: !!currentUser(c) })
})

function requestConnection(userId: string, slug: string) {
  const biz = findBusiness(slug)
  if (!biz) return { ok: false as const, code: 'ERR-BIZ-404', msg: 'We could not find that business. Check the code or link and try again.' }
  const me = db.query('SELECT name,email,phone FROM users WHERE id = ?').get(userId) as { name: string; email: string; phone: string }
  const prev = db.query("SELECT id,status FROM links WHERE business_id = ? AND user_id = ? AND deleted_at IS NULL AND status IN ('active','pending')").get(biz.id, userId) as { id: string; status: string } | null
  if (prev) return { ok: true as const, status: prev.status, business: biz.name, already: true }
  const status = biz.auto_approve ? 'active' : 'pending'
  const group = db.query('SELECT id FROM groups WHERE business_id = ? AND deleted_at IS NULL ORDER BY created_at LIMIT 1').get(biz.id) as { id: string } | null
  const prof = db.query('SELECT company,gstin,city,address FROM client_profiles WHERE user_id = ?').get(userId) as { company: string; gstin: string; city: string; address: string }
  db.query('INSERT INTO links (id,business_id,group_id,user_id,name,email,phone,company,gstin,city,address,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(uid(), biz.id, group?.id ?? null, userId, me.name, me.email, me.phone, prof.company, prof.gstin, prof.city, prof.address, status, nowIso())
  notify(biz.owner_id, status === 'pending' ? `${me.name} wants to connect` : `${me.name} connected`, status === 'pending' ? 'Approve the request to start invoicing them.' : 'They found you through your connect link.', '/studio/clients')
  return { ok: true as const, status, business: biz.name, already: false }
}

publicLinks.post('/connect/:slug', requireUser, (c) => {
  const r = requestConnection(c.get('user').id, c.req.param('slug'))
  if (!r.ok) return fail(c, 404, r.code, r.msg)
  return c.json(r)
})

/* ---------- Slip side: the businesses that invoice you ---------- */
export const slipConnections = new Hono<{ Variables: Vars }>()
slipConnections.use('*', requireUser)

slipConnections.get('/', (c) => {
  const rows = db.query(`SELECT l.id,l.status,b.name,b.city FROM links l JOIN businesses b ON b.id = l.business_id
    WHERE l.user_id = ? AND l.deleted_at IS NULL AND l.status IN ('active','pending') ORDER BY l.created_at DESC`).all(c.get('user').id)
  return c.json({ connections: rows })
})

slipConnections.post('/connect', async (c) => {
  const p = codeBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', 'Enter the business code or paste their connect link.')
  const code = p.data.code.split('/').filter(Boolean).pop() ?? ''
  const r = requestConnection(c.get('user').id, code)
  if (!r.ok) return fail(c, 404, r.code, r.msg)
  return c.json(r)
})

slipConnections.delete('/:id', (c) => {
  db.query("UPDATE links SET status = 'ended' WHERE id = ? AND user_id = ?").run(c.req.param('id'), c.get('user').id)
  return c.json({ ok: true })
})
