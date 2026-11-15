import { Hono } from 'hono'
import { requireUser, type Vars } from '../auth.ts'
import { db } from '../db.ts'
import { isProd } from '../env.ts'
import { fail } from '../security.ts'
import { runReminders } from '../reminders.ts'

export const misc = new Hono<{ Variables: Vars }>()
misc.use('*', requireUser)

misc.get('/notifications', (c) => c.json(db.query('SELECT id,title,body,link,created_at AS at,read_at AS readAt FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 60').all(c.get('user').id)))
misc.post('/notifications/read', (c) => { db.query('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(new Date().toISOString(), c.get('user').id); return c.json({ ok: true }) })

/* Local mailbox: the emails sent to your own address. Disabled in production. */
misc.get('/mailbox', (c) => {
  if (isProd) return fail(c, 404, 'ERR-NF-404', 'Not found.')
  return c.json(db.query('SELECT id,subject,body,link,created_at AS at FROM outbox WHERE to_email = ? COLLATE NOCASE ORDER BY created_at DESC LIMIT 40').all(c.get('user').email))
})

misc.post('/dev/run-reminders', async (c) => {
  if (isProd) return fail(c, 404, 'ERR-NF-404', 'Not found.')
  return c.json({ sent: await runReminders() })
})
