import { db, nowIso, uid } from './db.ts'
import { env, isProd } from './env.ts'

/* Every email is saved to the outbox so the in-app mailbox works locally.
   If RESEND_API_KEY is set, it is also sent for real. */
export async function sendMail(to: string, subject: string, body: string, link = ''): Promise<void> {
  if (!to) return
  db.query('INSERT INTO outbox (id,to_email,subject,body,link,created_at) VALUES (?,?,?,?,?,?)').run(uid(), to, subject, body, link, nowIso())
  if (!env.RESEND_API_KEY) { if (!isProd && env.NODE_ENV !== 'test') console.log(`[mail] to ${to} | ${subject}${link ? ` | ${link}` : ''}`); return }
  const text = link ? `${body}\n\n${link}` : body
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM, to, subject, text }),
    })
  } catch (e) { console.error('ERR-MAIL-502 email provider unreachable', (e as Error).message) }
}
