import { displayStatus, invoiceDto } from './access.ts'
import { automationOf, lateFeeFor, rulesFor, runRecurring } from './automation.ts'
import { db } from './db.ts'
import { env } from './env.ts'
import { addEvent, notifyAndMail } from './notify.ts'
import { money, shortDate } from './util.ts'

/* Whole calendar days in Indian time, so "due today" means today whatever the clock says. */
const istDay = (ms: number) => Math.floor((ms + 19_800_000) / 86_400_000)

/* Each reminder fires once: (invoice, key) is unique. Runs every few minutes and on demand in dev. */
export async function runReminders(): Promise<number> {
  runRecurring()
  const rows = db.query(`SELECT i.*, l.user_id AS client_user, l.email AS client_email, b.name AS biz_name, b.automation AS automation, g.reminders AS rules
    FROM invoices i JOIN links l ON l.id = i.link_id JOIN businesses b ON b.id = i.business_id LEFT JOIN groups g ON g.business_id = i.business_id AND g.id = (SELECT group_id FROM links WHERE id = i.link_id)
    WHERE i.status IN ('sent','viewed','partial') AND i.deleted_at IS NULL AND l.status != 'ended'`).all() as any[]
  let sent = 0
  const today = Date.now()
  for (const r of rows) {
    const dto = invoiceDto(r, 'business')
    const inr = (n: number) => money(n, dto.extra.currency)
    if (displayStatus(r, dto.totals.balance) === 'paid') continue
    const rules = rulesFor(r.extra, r.rules ?? null, r.automation)
    if (!rules) continue
    const fee = lateFeeFor(automationOf(r.automation).lateFee, dto.totals.balance, r.due)
    const days = istDay(new Date(r.due).getTime()) - istDay(today) // positive = days left
    const keys: { key: string; text: string }[] = []
    for (const d of rules.before) if (days === d) keys.push({ key: `before-${d}`, text: `due in ${d} day${d > 1 ? 's' : ''}` })
    if (rules.onDue && days === 0) keys.push({ key: 'due', text: 'due today' })
    if (rules.afterEvery && days < 0) { const n = Math.floor(-days / rules.afterEvery); if (n >= 1 && -days % rules.afterEvery === 0) keys.push({ key: `after-${n}`, text: `${-days} day${-days > 1 ? 's' : ''} overdue` }) }
    for (const k of keys) {
      const res = db.query('INSERT OR IGNORE INTO reminders_sent (invoice_id,key) VALUES (?,?)').run(r.id, k.key)
      if (!res.changes) continue
      await notifyAndMail(r.client_user, r.client_email, `Reminder: ${r.number} is ${k.text}`, `${r.biz_name}: ${inr(dto.totals.balance)} on invoice ${r.number} is ${k.text} (due ${shortDate(r.due)}).${fee ? ` A late fee of ${inr(fee)} applies under the agreed terms.` : ''}`, r.client_user ? `${env.APP_URL}/slip/invoices/${r.id}` : '')
      addEvent(r.id, 'reminder', `Automatic reminder: ${k.text}`)
      sent++
    }
  }
  return sent
}
