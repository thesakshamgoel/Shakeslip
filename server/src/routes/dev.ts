import { Hono } from 'hono'
import { seedDemo, DEMO, DEMO_PASSWORD } from '../demo.ts'
import { isProd } from '../env.ts'

/* Local testing helpers. Not mounted when NODE_ENV=production. */
export function devRoutes(fetch: (r: Request) => Response | Promise<Response>) {
  const dev = new Hono()
  dev.post('/demo', async (c) => {
    if (isProd) return c.json({ code: 'ERR-NF-404', message: 'Not found.' }, 404)
    const created = await seedDemo(fetch)
    return c.json({ ok: true, created, studio: { email: DEMO.studio, password: DEMO_PASSWORD }, client: { email: DEMO.client, password: DEMO_PASSWORD } })
  })
  return dev
}
