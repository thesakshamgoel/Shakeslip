import { db, nowIso, uid } from './db.ts'
import { sendMail } from './mailer.ts'

export type EventKind = 'created' | 'sent' | 'whatsapp' | 'viewed' | 'reminder' | 'payment' | 'claimed' | 'confirmed' | 'details' | 'change' | 'accepted'

export function addEvent(invoiceId: string, kind: EventKind, text: string, audience: 'both' | 'business' | 'client' = 'both') {
  db.query('INSERT INTO events (id,invoice_id,kind,text,audience,at) VALUES (?,?,?,?,?,?)').run(uid(), invoiceId, kind, text, audience, nowIso())
}

export function notify(userId: string | null | undefined, title: string, body: string, link = '') {
  if (!userId) return
  db.query('INSERT INTO notifications (id,user_id,title,body,link,created_at) VALUES (?,?,?,?,?,?)').run(uid(), userId, title, body, link, nowIso())
}

/* In-app notification plus an email copy. */
export async function notifyAndMail(userId: string | null | undefined, email: string, title: string, body: string, link = '') {
  notify(userId, title, body, link)
  await sendMail(email, title, body, link)
}
