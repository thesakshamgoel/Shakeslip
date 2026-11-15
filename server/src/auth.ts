import type { Context, MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { db, nowIso } from './db.ts'
import { isProd } from './env.ts'
import { sha256, token } from './util.ts'

export type User = { id: string; email: string; name: string; phone: string }
export type Vars = { user: User }
const COOKIE = 'ss_session'
const DAYS = 30

export async function hashPassword(pw: string) { return Bun.password.hash(pw, { algorithm: 'argon2id' }) }
export async function verifyPassword(pw: string, hash: string) { try { return await Bun.password.verify(pw, hash) } catch { return false } }

/* A real hash to compare against when the email does not exist, so timing does not reveal accounts. */
export const DUMMY_HASH = await hashPassword('not-a-real-password-for-timing')

export function startSession(c: Context, userId: string) {
  const t = token()
  const expires = new Date(Date.now() + DAYS * 86_400_000).toISOString()
  db.query('INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').run(sha256(t), userId, expires, nowIso())
  setCookie(c, COOKIE, t, { httpOnly: true, sameSite: 'Lax', secure: isProd, path: '/', maxAge: DAYS * 86_400 })
}

export function endSession(c: Context) {
  const t = getCookie(c, COOKIE)
  if (t) db.query('DELETE FROM sessions WHERE token_hash = ?').run(sha256(t))
  deleteCookie(c, COOKIE, { path: '/' })
}

export function currentUser(c: Context): User | null {
  const t = getCookie(c, COOKIE)
  if (!t) return null
  const row = db.query(`SELECT u.id,u.email,u.name,u.phone FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.deleted_at IS NULL`).get(sha256(t), nowIso()) as User | null
  return row
}

export const requireUser: MiddlewareHandler<{ Variables: Vars }> = async (c, next) => {
  const u = currentUser(c)
  if (!u) return c.json({ code: 'ERR-AUTH-401', message: 'Please sign in to continue.' }, 401)
  c.set('user', u)
  await next()
}
