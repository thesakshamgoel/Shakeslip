import { db, nowIso, uid } from './db.ts'
import { addEvent, notify } from './notify.ts'
import type { LateFee, ReminderRules } from './schemas.ts'
import { json } from './util.ts'

export const DEFAULT_RULES: ReminderRules = { before: [2], onDue: true, afterEvery: 7 }
export const NO_FEE: LateFee = { kind: 'none', pct: 0, flat: 0, graceDays: 0 }
export type Automation = { reminders: ReminderRules; lateFee: LateFee }

export const automationOf = (raw: string | null | undefined): Automation => {
  const a = json<Partial<Automation>>(raw ?? '{}', {})
  return { reminders: { ...DEFAULT_RULES, ...a.reminders }, lateFee: { ...NO_FEE, ...a.lateFee } }
}

/* Which reminder rules apply: the invoice's own, then the client's group, then the business default. */
export function rulesFor(extraRaw: string, groupRaw: string | null, bizRaw: string | null): ReminderRules | null {
  const ex = json<{ reminders?: ReminderRules | null; remindersOff?: boolean }>(extraRaw ?? '{}', {})
  if (ex.remindersOff) return null
  if (ex.reminders) return ex.reminders
  if (groupRaw) return { ...DEFAULT_RULES, ...json<Partial<ReminderRules>>(groupRaw, {}) }
  return automationOf(bizRaw).reminders
}

/* Late fee owed on a balance, in paise. Percent is per started month after the grace period; flat is charged once. */
export function lateFeeFor(fee: LateFee, balance: number, due: string, now = Date.now()): number {
  if (fee.kind === 'none' || balance <= 0) return 0
  const daysLate = Math.floor((now - new Date(due).getTime()) / 86_400_000) - fee.graceDays
  if (daysLate <= 0) return 0
  if (fee.kind === 'flat') return fee.flat
  return Math.round((balance * fee.pct * Math.ceil(daysLate / 30)) / 100)
}

const addMonth = (iso: string) => { const d = new Date(iso); const day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(Math.min(day, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate())); return d.toISOString() }

/* Monthly repeats: once a month has passed since a sent repeating invoice was issued, draft the next one. Each fires once. */
export function runRecurring(now = Date.now()): number {
  const rows = db.query(`SELECT i.id, i.number, i.issued, i.due, i.extra, i.link_id, b.owner_id FROM invoices i JOIN businesses b ON b.id = i.business_id
    JOIN links l ON l.id = i.link_id WHERE i.status NOT IN ('draft','void') AND i.deleted_at IS NULL AND l.deleted_at IS NULL AND l.status != 'ended'`).all() as any[]
  let made = 0
  for (const r of rows) {
    if (json<{ repeat?: string }>(r.extra, {}).repeat !== 'monthly') continue
    const next = addMonth(r.issued)
    if (new Date(next).getTime() > now) continue
    if (!db.query("INSERT OR IGNORE INTO reminders_sent (invoice_id,key) VALUES (?, 'repeat')").run(r.id).changes) continue
    const id = uid()
    const span = Math.max(0, new Date(r.due).getTime() - new Date(r.issued).getTime())
    db.query(`INSERT INTO invoices (id,business_id,link_id,type_id,type_snapshot,theme,bill_to,items,fields,gst_pct,discount,advance,issued,due,note,project,terms,tax_inclusive,extra,status,created_at,source_id)
      SELECT ?,business_id,link_id,type_id,type_snapshot,theme,bill_to,items,fields,gst_pct,discount,0,?,?,note,project,terms,tax_inclusive,extra,'draft',?,? FROM invoices WHERE id = ?`)
      .run(id, next, new Date(new Date(next).getTime() + span).toISOString(), nowIso(), r.id, r.id)
    addEvent(id, 'created', `Monthly repeat of ${r.number} drafted`, 'business')
    notify(r.owner_id, 'Next month\'s invoice is ready', `A draft repeating ${r.number} is waiting. Check it and send.`, `/studio/invoices/${id}/edit`)
    made++
  }
  return made
}
