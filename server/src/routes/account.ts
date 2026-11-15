import { Hono } from 'hono'
import { z } from 'zod'
import { bizOf } from '../access.ts'
import { refreshCode } from './business.ts'
import { DUMMY_HASH, endSession, hashPassword, requireUser, startSession, verifyPassword, currentUser, type Vars } from '../auth.ts'
import { audit, db, nowIso, uid } from '../db.ts'
import { env } from '../env.ts'
import { verifyGoogleToken } from '../google.ts'
import { sendMail } from '../mailer.ts'
import { clientProfileBody, forgotBody, googleBody, logoBody, loginBody, resetBody, signupBody } from '../schemas.ts'
import { sha256, token } from '../util.ts'
import { clearLimit, fail, ipOf, limited } from '../security.ts'

export const TERMS_VERSION = '2026-11'
export const account = new Hono<{ Variables: Vars }>()

const first = (e: z.ZodError) => e.issues[0]?.message ?? 'Please check the details and try again.'

account.post('/signup', async (c) => {
  const wait = limited(`signup:${ipOf(c)}`, 10, 3_600_000)
  if (wait) return fail(c, 429, 'ERR-RATE-429', 'Too many sign-ups from this device. Please try again later.')
  const p = signupBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', first(p.error))
  const b = p.data
  if (db.query('SELECT 1 FROM users WHERE email = ?').get(b.email)) return fail(c, 409, 'ERR-AUTH-409', 'An account with this email already exists. Try signing in instead.')
  const id = uid()
  const t = nowIso()
  db.query('INSERT INTO users (id,email,name,phone,password_hash,terms_version,terms_accepted_at,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, b.email, b.name, '', await hashPassword(b.password), TERMS_VERSION, t, t)
  db.query('INSERT INTO client_profiles (user_id) VALUES (?)').run(id)
  audit(id, 'signup', 'user', id)
  startSession(c, id)
  return c.json({ ok: true, next: b.role === 'studio' ? '/studio/setup' : '/slip' })
})

account.post('/login', async (c) => {
  const p = loginBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', 'Enter your email and password.')
  const key = `login:${ipOf(c)}:${p.data.email}`
  const wait = limited(key, 5, 15 * 60_000)
  if (wait) return fail(c, 429, 'ERR-RATE-429', `Too many attempts. Please wait ${Math.ceil(wait / 60)} minutes and try again.`)
  const u = db.query('SELECT id,password_hash FROM users WHERE email = ? AND deleted_at IS NULL').get(p.data.email) as { id: string; password_hash: string } | null
  const ok = await verifyPassword(p.data.password, u?.password_hash ?? DUMMY_HASH)
  if (!u || !ok) return fail(c, 401, 'ERR-AUTH-401', 'That email and password do not match. Please try again.')
  clearLimit(key)
  startSession(c, u.id)
  audit(u.id, 'login', 'user', u.id)
  return c.json({ ok: true })
})

/* Continue with Google (Firebase Auth). Existing accounts are signed in; new ones need a role and accepted terms. */
account.post('/google', async (c) => {
  const wait = limited(`google:${ipOf(c)}`, 20, 15 * 60_000)
  if (wait) return fail(c, 429, 'ERR-RATE-429', 'Too many attempts. Please try again in a few minutes.')
  if (!env.FIREBASE_PROJECT_ID) return fail(c, 503, 'ERR-AUTH-503', 'Google sign-in is not set up yet. Please use email for now.')
  const p = googleBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', 'Google sign-in did not complete. Please try again.')
  const g = await verifyGoogleToken(p.data.idToken)
  if (!g) return fail(c, 401, 'ERR-AUTH-401', 'We could not verify that Google account. Please try again.')
  const u = db.query('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL').get(g.email) as { id: string } | null
  if (u) { startSession(c, u.id); audit(u.id, 'login-google', 'user', u.id); return c.json({ ok: true, next: null }) }
  if (!p.data.role) return fail(c, 404, 'ERR-AUTH-404', 'There is no Shakeslip account for that Google email yet. Create one from the sign-up page.')
  if (p.data.acceptTerms !== true) return fail(c, 422, 'ERR-VAL-422', 'Please tick the box to accept the terms and privacy policy.')
  const id = uid(), t = nowIso()
  /* no password for Google accounts: store a hash of a random value nobody knows */
  db.query('INSERT INTO users (id,email,name,phone,password_hash,terms_version,terms_accepted_at,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, g.email, g.name, '', await hashPassword(token()), TERMS_VERSION, t, t)
  db.query('INSERT INTO client_profiles (user_id) VALUES (?)').run(id)
  audit(id, 'signup-google', 'user', id)
  startSession(c, id)
  return c.json({ ok: true, next: p.data.role === 'studio' ? '/studio/setup' : '/slip' })
})

account.post('/logout', (c) => { endSession(c); return c.json({ ok: true }) })

account.get('/me', (c) => {
  const user = currentUser(c)
  if (!user) return c.json({ user: null })
  let biz = bizOf(user.id)
  if (biz) { refreshCode(biz as never); biz = bizOf(user.id) }
  const profile = db.query('SELECT company,gstin,address,city,pin,state,honorific,area,pan,logo FROM client_profiles WHERE user_id = ?').get(user.id)
  const unread = (db.query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL').get(user.id) as { n: number }).n
  const b = biz as any
  return c.json({ user, profile, unread, business: b && {
    id: b.id, name: b.name, slug: b.slug, gstin: b.gstin, address: b.address, city: b.city, email: b.email, phone: b.phone, autoApprove: !!b.auto_approve,
    pan: b.pan, website: b.website, state: b.state, upiId: b.upi_id, bankName: b.bank_name, accountName: b.account_name, accountNo: b.account_no, ifsc: b.ifsc,
    profession: b.profession, signature: JSON.parse(b.signature || '{}'), logo: b.logo, logoSize: b.logo_size,
    slugAt: b.slug_at, phones: JSON.parse(b.phones || '[]'), emails: JSON.parse(b.emails || '[]'), catalogue: JSON.parse(b.catalogue || '{"services":[],"packages":[]}'), qrImage: b.qr_image, defaultTheme: b.default_theme, defaultLayout: b.default_layout, defaultTerms: JSON.parse(b.default_terms || '[]'), defaultCustomTerms: b.default_custom_terms,
  } })
})

account.put('/me', requireUser, async (c) => {
  const p = clientProfileBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', first(p.error))
  const u = c.get('user')
  const b = p.data
  db.query('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(b.name, b.phone, u.id)
  db.query('UPDATE client_profiles SET company = ?, gstin = ?, address = ?, city = ?, pin = ?, state = ?, honorific = ?, area = ?, pan = ? WHERE user_id = ?')
    .run(b.company, b.gstin, b.address, b.city, b.pin, b.gstin ? b.gstin.slice(0, 2) : b.state, b.honorific, b.area, b.pan, u.id)
  return c.json({ ok: true })
})

/* A client's own business logo. It shows in the Bill to block on invoices sent to them. */
account.put('/logo', requireUser, async (c) => {
  const p = logoBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', p.error.issues[0].message)
  db.query('UPDATE client_profiles SET logo = ? WHERE user_id = ?').run(p.data.image, c.get('user').id)
  return c.json({ ok: true })
})

/* Account deletion: soft delete, sign out everywhere, and free the email address. */
account.post('/me/delete', requireUser, async (c) => {
  const u = c.get('user')
  db.query('UPDATE users SET deleted_at = ?, email = ? WHERE id = ?').run(nowIso(), `deleted+${u.id}@invalid`, u.id)
  db.query('DELETE FROM sessions WHERE user_id = ?').run(u.id)
  db.query("UPDATE links SET status = 'ended' WHERE user_id = ?").run(u.id)
  audit(u.id, 'delete', 'user', u.id)
  endSession(c)
  return c.json({ ok: true })
})

/* Password reset. Always answers the same way so nobody can find out which emails have accounts. */
account.post('/forgot', async (c) => {
  const p = forgotBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', 'Enter a valid email address.')
  if (limited(`forgot:${ipOf(c)}`, 5, 3_600_000)) return fail(c, 429, 'ERR-RATE-429', 'Too many requests. Please try again later.')
  const u = db.query('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL').get(p.data.email) as { id: string } | null
  if (u) {
    const t = token(24)
    db.query('INSERT INTO password_resets (token_hash,user_id,expires_at) VALUES (?,?,?)').run(sha256(t), u.id, new Date(Date.now() + 3_600_000).toISOString())
    await sendMail(p.data.email, 'Reset your Shakeslip password', 'Use this link within one hour to choose a new password. If you did not ask for this, you can ignore this email.', `${env.APP_URL}/reset/${t}`)
  }
  return c.json({ ok: true })
})

account.post('/reset', async (c) => {
  const p = resetBody.safeParse(await c.req.json().catch(() => ({})))
  if (!p.success) return fail(c, 422, 'ERR-VAL-422', first(p.error))
  const row = db.query('SELECT user_id FROM password_resets WHERE token_hash = ? AND expires_at > ?').get(sha256(p.data.token), nowIso()) as { user_id: string } | null
  if (!row) return fail(c, 404, 'ERR-RST-404', 'This reset link has expired. Ask for a new one.')
  db.query('UPDATE users SET password_hash = ? WHERE id = ?').run(await hashPassword(p.data.password), row.user_id)
  db.query('DELETE FROM password_resets WHERE user_id = ?').run(row.user_id)
  db.query('DELETE FROM sessions WHERE user_id = ?').run(row.user_id)
  audit(row.user_id, 'password-reset', 'user', row.user_id)
  return c.json({ ok: true })
})
