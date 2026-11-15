import { motion } from 'motion/react'
import { useState } from 'react'
import { BellRing } from 'lucide-react'
import { Chip } from '../../components/Chip'
import { DatePicker } from '../../components/DatePicker'
import { Field, TextArea } from '../../components/Field'
import { ContactPicker, QrSetup } from './PayInline'
import { WhyCard } from '../../components/WhyCard'
import { ReminderRules, rulesText } from '../../components/ReminderRules'
import { fromDateInput, toDateInput } from '../../lib/dates'
import { money } from '../../lib/money'
import { springSoft } from '../../lib/motion'
import { planRows, PLANS } from '../../lib/scope'
import type { Business, Group, InvoiceType } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { FieldInput } from '../EditorParts'
import { feeText, type Automation } from '../settings/AutomationSection'
import { daysBetween, isoIn, type Draft } from './state'

const DUE = [0, 7, 15, 30, 45]

/* Step 4: how and when they pay. Plan, due date, reminders, and what payment details print. */
export function PaymentStep({ d, set, type, from, total, group }: { d: Draft; set: (p: Partial<Draft>, m?: string) => void; type: InvoiceType; from: Business; total: number; group?: Group }) {
  const x = d.extra
  const [why, setWhy] = useState<'' | 'bank' | 'image' | 'upi' | 'phone'>('')
  const ex = (p: Partial<Draft['extra']>) => set({ extra: { ...x, ...p } })
  const rows = planRows(x.plan.kind, x.plan.advancePct, total, x.plan.text)
  const dueIn = daysBetween(d.issued, d.due)
  const auto = useApi<Automation>('/studio/automation').data
  const usual = group?.reminders ?? auto?.reminders ?? { before: [2], onDue: true, afterEvery: 7 }
  const mode = x.remindersOff ? 'off' : x.reminders ? 'custom' : 'usual'
  const fee = auto && auto.lateFee.kind !== 'none' ? feeText(auto.lateFee) : ''
  return (
    <div className="st">
      <section className="st-block">
        <h3>Payment plan</h3>
        <div className="chips2">{PLANS.map((p) => <Chip key={p.kind} icon={false} on={x.plan.kind === p.kind} onClick={() => {
          const due = p.kind === 'net15' ? 15 : p.kind === 'net30' ? 30 : p.kind === 'due_on_receipt' ? 0 : null
          set({ extra: { ...x, plan: { ...x.plan, kind: p.kind } }, ...(due !== null ? { due: isoIn(due, new Date(d.issued)) } : {}), ...(p.kind === 'on_completion' && x.completionDate ? { due: fromDateInput(x.completionDate) } : {}) })
        }}>{p.label}</Chip>)}</div>
        {x.plan.kind === 'advance_balance' && (
          <label className="field"><span>Advance {x.plan.advancePct}% now · {100 - x.plan.advancePct}% on delivery</span>
            <input type="range" min={10} max={90} step={5} value={x.plan.advancePct} className="range" onChange={(e) => ex({ plan: { ...x.plan, advancePct: Number(e.target.value) } })} /></label>
        )}
        {x.plan.kind === 'custom' && <Field label="Your payment terms" value={x.plan.text} maxLength={200} onChange={(e) => ex({ plan: { ...x.plan, text: e.target.value } })} />}
        {rows.length > 0 && (
          <ol className="tline">{rows.map((row, i) => (
            <motion.li key={row.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...springSoft, delay: i * 0.06 }}>
              <span className="tline-dot" aria-hidden /><span className="tline-t"><b>{row.label}</b><small>{row.when}</small></span><b className="num">{row.amount == null ? '' : money(row.amount)}</b>
            </motion.li>
          ))}</ol>
        )}
      </section>

      <section className="st-block">
        <h3>Due date</h3>
        <div className="chips2">
          {DUE.map((n) => <Chip key={n} icon={false} on={dueIn === n} onClick={() => set({ due: isoIn(n, new Date(d.issued)) })}>{n === 0 ? 'On receipt' : `${n} days`}</Chip>)}
        </div>
        <DatePicker label="Or pick a date" value={toDateInput(d.due)} min={toDateInput(d.issued)} onChange={(v) => v && set({ due: fromDateInput(v) })} />
      </section>

      <section className="st-block">
        <h3>Reminders and repeats</h3>
        <div className="seg2 seg3c">
          {([['usual', group ? `${group.name} schedule` : 'Usual schedule'], ['custom', 'Custom'], ['off', 'Off']] as const).map(([k, l]) => (
            <button key={k} type="button" className="seg2-b tap" aria-pressed={mode === k} onClick={() => ex(k === 'off' ? { remindersOff: true, reminders: null } : k === 'custom' ? { remindersOff: false, reminders: x.reminders ?? usual } : { remindersOff: false, reminders: null })}>{l}</button>
          ))}
        </div>
        {mode === 'custom' && x.reminders && <ReminderRules value={x.reminders} onChange={(r) => ex({ reminders: r })} />}
        <p className="explain"><BellRing size={15} aria-hidden />{mode === 'off' ? 'No automatic reminders for this invoice. You can still send one by hand.' : `Your client is reminded ${rulesText(mode === 'custom' && x.reminders ? x.reminders : usual)}, by email and in Slip, until it is paid.`}{fee ? ` Late fee: ${fee}.` : ''}</p>
        <label className="switch-row"><span><b>Repeat every month</b><small>{x.repeat === 'monthly' ? 'A copy is drafted a month after the issue date for you to check and send.' : 'For retainers and monthly work.'}</small></span><input type="checkbox" role="switch" checked={x.repeat === 'monthly'} onChange={(e) => ex({ repeat: e.target.checked ? 'monthly' : 'none' })} /></label>
      </section>

      <section className="st-block">
        <h3>Printed on the invoice</h3>
        <label className="switch-row"><span><b>Bank details</b><small>{from.accountNo ? `${from.bankName || 'Bank'} ····${from.accountNo.slice(-4)}` : 'Add them in Settings → Getting paid'}</small></span><input type="checkbox" role="switch" className={from.accountNo || from.upiId ? '' : 'soft-off'} aria-disabled={!(from.accountNo || from.upiId)} checked={x.showBank && !!(from.accountNo || from.upiId)} onChange={(e) => { if (!(from.accountNo || from.upiId)) { setWhy(why === 'bank' ? '' : 'bank'); return } ex({ showBank: e.target.checked }) }} /></label>
        <WhyCard open={why === 'bank'} title="No bank details yet" text="Add your bank account or UPI ID once and they print on every invoice." to="/studio/settings?s=paid" action="Add payment details" onClose={() => setWhy('')} />
        <label className="switch-row"><span><b>Payment QR</b><small>{x.showQr === false ? 'Hidden on this invoice' : 'Scan to pay, with the exact amount'}</small></span><input type="checkbox" role="switch" checked={x.showQr !== false} onChange={(e) => ex({ showQr: e.target.checked })} /></label>
        {x.showQr !== false && (
          <div className="field"><span>Which QR</span>
            <div className="seg2">
              {([['upi', 'UPI QR', !!from.upiId], ['image', 'My QR image', !!from.qrImage]] as const).map(([k, l, ok]) => (
                <button key={k} type="button" className={`seg2-b tap ${ok ? '' : 'soft-off'}`} aria-disabled={!ok} aria-pressed={ok && (x.qrMode ?? 'upi') === k} onClick={() => { if (!ok) { setWhy(why === k ? '' : k); return } setWhy(''); ex({ qrMode: k }) }}>{l}</button>
              ))}
            </div>
            <WhyCard open={why === 'image'} title="No QR image yet" text="Upload your own payment QR, for example from your bank app. It prints instead of the generated one, and is saved in Settings too." onClose={() => setWhy('')}><QrSetup kind="image" onDone={() => { setWhy(''); ex({ qrMode: 'image' }) }} /></WhyCard>
            <WhyCard open={why === 'upi'} title="No UPI ID yet" text="Add your UPI ID and Shakeslip makes a QR with the exact amount for each invoice. It is saved in Settings too." onClose={() => setWhy('')}><QrSetup kind="upi" onDone={() => { setWhy(''); ex({ qrMode: 'upi' }) }} /></WhyCard>
            <small className="hint">{(x.qrMode ?? 'upi') === 'image' ? 'Uses your uploaded QR image.' : from.upiId ? `Generated for ${from.upiId} with the exact amount.` : 'Tap UPI QR to add a UPI ID.'}</small>
          </div>
        )}
        <label className="switch-row"><span><b>Payment mobile number</b><small>{(from.phones ?? []).length ? 'Choose which number prints' : from.phone || 'Add numbers in Settings → Getting paid'}</small></span><input type="checkbox" role="switch" checked={x.showMobile} onChange={(e) => ex({ showMobile: e.target.checked })} /></label>
        {x.showMobile && (from.phones ?? []).length > 1 && <div className="chips2">{from.phones!.map((p) => <Chip key={p.id} icon={false} on={(x.phoneId || from.phones!.find((q) => q.isDefault)?.id) === p.id} onClick={() => ex({ phoneId: p.id })}>{p.label}: {p.number}</Chip>)}</div>}
        <ContactPicker d={d} ex={ex} from={from} />
      </section>

      <section className="st-block">
        <h3>Note</h3>
        {type.fields.filter((f) => f.place === 'bottom').map((f) => <FieldInput key={f.id} f={f} value={d.fields[f.id] ?? ''} onChange={(v) => set({ fields: { ...d.fields, [f.id]: v } }, `f-${f.id}`)} />)}
        <TextArea label="Note to client (optional)" value={d.note} maxLength={600} onChange={(e) => set({ note: e.target.value }, 'note')} />
      </section>
    </div>
  )
}
