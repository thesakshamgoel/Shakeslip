import { useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { Field } from '../../components/Field'
import { ReminderRules, rulesText, type Rules } from '../../components/ReminderRules'
import { errText, put } from '../../lib/api'
import { inr, toPaise } from '../../lib/money'
import { useToast } from '../../lib/toast'
import { useApi } from '../../lib/useApi'

export type LateFee = { kind: 'none' | 'percent' | 'flat'; pct: number; flat: number; graceDays: number }
export type Automation = { reminders: Rules; lateFee: LateFee }

/* One sentence describing a late fee, used here and in the editor. */
export const feeText = (f: LateFee) => f.kind === 'none' ? '' : `${f.kind === 'percent' ? `${f.pct}% of the balance for each month` : `A one-time ${inr(f.flat)}`} ${f.graceDays ? `once it is more than ${f.graceDays} ${f.graceDays === 1 ? 'day' : 'days'} late` : 'once it is late'}`

/* What happens on its own: reminder schedule for clients outside a group, and an optional late fee. */
export function AutomationSection() {
  const { data, reload } = useApi<Automation>('/studio/automation')
  const toast = useToast()
  const [a, setA] = useState<Automation | null>(null)
  const [flat, setFlat] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (data && !a) { setA(data); setFlat(data.lateFee.flat ? String(data.lateFee.flat / 100) : '') } }, [data, a])
  if (!a) return <section className="set-card" aria-busy="true" style={{ minHeight: 320 }} />
  const fee = a.lateFee
  const setFee = (p: Partial<LateFee>) => setA({ ...a, lateFee: { ...fee, ...p } })
  async function save() {
    if (busy || !a) return
    setBusy(true)
    try { await put('/studio/automation', { ...a, lateFee: { ...a.lateFee, flat: toPaise(flat) } }); await reload(); toast.ok('Automation saved.') } catch (x) { toast.bad(errText(x)) } finally { setBusy(false) }
  }
  return (
    <>
      <section className="set-card">
        <header><h2>Reminders</h2><p>Sent by email and in your client's Slip inbox, only while money is owed. Groups and single invoices can set their own; this schedule is for clients outside a group.</p></header>
        <ReminderRules value={a.reminders} onChange={(r) => setA({ ...a, reminders: r })} />
        <p className="hint">Now: {rulesText(a.reminders)}.</p>
      </section>
      <section className="set-card">
        <header><h2>Late fee</h2><p>Shakeslip never changes an invoice after it is sent. When a fee is due, reminders mention it and you can bill it on a new invoice in one tap.</p></header>
        <div className="chips2">{([['none', 'No late fee'], ['percent', 'Percent a month'], ['flat', 'Flat amount']] as const).map(([k, l]) => <Chip key={k} icon={false} on={fee.kind === k} onClick={() => setFee({ kind: k, pct: k === 'percent' && !fee.pct ? 2 : fee.pct })}>{l}</Chip>)}</div>
        {fee.kind !== 'none' && (
          <div className="grid2">
            {fee.kind === 'percent'
              ? <label className="field"><span>{fee.pct}% a month</span><input type="range" className="range" min={0.5} max={5} step={0.5} value={fee.pct || 0.5} onChange={(e) => setFee({ pct: Number(e.target.value) })} /></label>
              : <Field label="Amount (₹)" inputMode="decimal" value={flat} onChange={(e) => setFlat(e.target.value.replace(/[^\d.]/g, ''))} />}
            <Field label="Grace period (days)" inputMode="numeric" value={String(fee.graceDays)} onChange={(e) => setFee({ graceDays: Math.min(60, Number(e.target.value.replace(/\D/g, '')) || 0) })} />
          </div>
        )}
        {fee.kind !== 'none' && <p className="hint">{feeText({ ...fee, flat: toPaise(flat) })}. Add a late-fee clause to your terms so clients have agreed to it. Ask a CA or lawyer if you are unsure what you can charge.</p>}
      </section>
      <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving' : 'Save automation'}</Button>
    </>
  )
}
