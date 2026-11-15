import type { Context, MiddlewareHandler } from 'hono'
import { env, isProd } from './env.ts'

/* Security headers on every response. */
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  c.header('Cross-Origin-Resource-Policy', 'same-origin')
  c.header('Cache-Control', 'no-store')
  if (isProd) c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
}

/* CSRF: state-changing requests must come from our own origin and carry JSON. */
export const csrfGuard: MiddlewareHandler = async (c, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)) {
    const origin = c.req.header('origin')
    if (origin && origin !== new URL(env.APP_URL).origin) return c.json({ code: 'ERR-CSRF-403', message: 'This request was blocked for your safety. Please reload the page and try again.' }, 403)
    const ct = c.req.header('content-type') ?? ''
    if (c.req.header('content-length') !== '0' && c.req.raw.body && !ct.includes('application/json')) return c.json({ code: 'ERR-REQ-415', message: 'Unsupported request.' }, 415)
  }
  await next()
}

/* Simple in-memory limiter. Fine for one server; use Redis when scaling out. */
const hits = new Map<string, { n: number; reset: number }>()
export function limited(key: string, max: number, windowMs: number): number {
  const now = Date.now()
  const h = hits.get(key)
  if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + windowMs }); return 0 }
  h.n += 1
  return h.n > max ? Math.ceil((h.reset - now) / 1000) : 0
}
export const clearLimit = (key: string) => hits.delete(key)
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k) }, 60_000).unref()

export const ipOf = (c: Context) => c.req.header('x-forwarded-for')?.split(',')[0].trim() || 'local'

export const fail = (c: Context, status: 400 | 401 | 403 | 404 | 409 | 422 | 429, code: string, message: string) => c.json({ code, message }, status)
