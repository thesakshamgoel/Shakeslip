import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { secureHeaders } from 'hono/secure-headers'
import { account } from './routes/account.ts'
import { business } from './routes/business.ts'
import { inbox } from './routes/inbox.ts'
import { invoices } from './routes/invoices.ts'
import { publicLinks, slipConnections, studioLinks } from './routes/links.ts'
import { devRoutes } from './routes/dev.ts'
import { misc } from './routes/misc.ts'
import { stats } from './routes/stats.ts'
import { automation } from './routes/automation.ts'
import { runReminders } from './reminders.ts'
import { csrfGuard, securityHeaders } from './security.ts'
import { env, isProd } from './env.ts'
import './db.ts'

const app = new Hono()
app.use('*', securityHeaders)
app.use('*', secureHeaders())
app.use('/api/*', csrfGuard)

if (!isProd) app.route('/api/dev', devRoutes((r) => app.fetch(r)))
app.route('/api/account', account)
app.route('/api', publicLinks)
app.route('/api', misc)
app.route('/api/studio/links', studioLinks)
app.route('/api/studio/invoices', invoices)
app.route('/api/studio/stats', stats)
app.route('/api/studio/automation', automation)
app.route('/api/studio', business)
app.route('/api/slip/connections', slipConnections)
app.route('/api/slip/invoices', inbox)

/* Production: the same server also serves the built website, so login cookies stay on one domain. */
if (isProd) {
  app.get('/healthz', (c) => c.text('ok'))
  app.use('*', serveStatic({ root: env.WEB_DIST, onFound: (path, c) => { c.header('Cache-Control', path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache') } }))
  app.get('*', async (c) => (c.req.path.startsWith('/api/') || /\.[a-z0-9]{2,5}$/i.test(c.req.path) ? c.notFound() : new Response(Bun.file(`${env.WEB_DIST}/index.html`), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } })))
}

app.notFound((c) => c.json({ code: 'ERR-NF-404', message: 'That does not exist.' }, 404))
/* Never leak internals: log the real error, show a friendly one. */
app.onError((e, c) => { console.error('ERR-SRV-500', e); return c.json({ code: 'ERR-SRV-500', message: 'Something went wrong on our side. Please try again in a moment.' }, 500) })

setInterval(() => { runReminders().catch((e) => console.error('ERR-REM-500', e)) }, 5 * 60_000).unref()

export default { port: env.PORT, fetch: app.fetch }
console.log(`Shakeslip API on http://localhost:${env.PORT}`)
