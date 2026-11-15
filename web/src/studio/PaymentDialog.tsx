import { useState } from 'react'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { DatePicker } from '../components/DatePicker'
import { Dialog } from '../components/Dialog'
import { Field } from '../components/Field'
import { Select } from '../components/Select'
import { fromDateInput, toDateInput } from '../lib/dates'
import { money, rupees, toPaise } from '../lib/money'
import type { Payment } from '../lib/types'

export type PayKind = 'payment' | 'advance' | 'tds' | 'writeoff' | 'refund'
const KINDS: { id: PayKind; label: string; hint: string }[] = [
  { id: 'payment', label: 'Payment', hint: 'Money received against this invoice.' },
  { id: 'advance', label: 'Advance', hint: 'Received before the work is done.' },
  { id: 'tds', label: 'TDS deducted', hint: 'Tax your client deducted at source. Ask them for Form 16A.' },
  { id: 'writeoff', label: 'Write-off', hint: 'An amount you agree not to collect.' },
  { id: 'refund', label: 'Refund', hint: 'Money you returned. It is added back to the balance.' },
]

/* Every way money moves on an invoice, each with an optional note, so the record stays honest. */
export function PaymentDialog({ open, onClose, balance, paid, busy, onSave, editing }: { open: boolean; onClose: () => void; balance: number; paid: number; busy: boolean; onSave: (b: Record<string, unknown>) => void; editing?: Payment | null }) {
  const [kind, setKind] = useState<PayKind>((editing?.kind as PayKind) ?? 'payment')
  const [amount, setAmount] = useState(editing ? rupees(editing.amount) : rupees(balance))
  const [method, setMethod] = useState(editing?.method ?? 'upi')
  const [date, setDate] = useState(toDateInput(editing?.paidAt ?? new Date().toISOString()))
  const [ref, setRef] = useState(editing?.ref ?? '')
  const [note, setNote] = useState(editing?.note ?? '')
  /* editing: the amount may use what this payment already covers */
  const max = kind === 'refund' ? paid + (editing?.amount ?? 0) : balance + (editing?.amount ?? 0)
  const val = toPaise(amount)
  const err = val <= 0 ? 'Enter an amount.' : val > max ? `That is more than ${kind === 'refund' ? 'was paid' : 'the balance'} (${money(max)}).` : ''
  const pick = (k: PayKind) => { setKind(k); setAmount(rupees(k === 'refund' ? 0 : k === 'tds' ? Math.round(balance * 0.1) : balance)) }
  return (
    <Dialog open={open} onClose={onClose} title={editing ? `Edit ${KINDS.find((k) => k.id === kind)!.label.toLowerCase()}` : 'Record money in or out'}>
      <div className="dlg-form">
        {!editing && <div className="chips2" role="radiogroup" aria-label="What happened">{KINDS.map((k) => <Chip key={k.id} icon={false} on={kind === k.id} onClick={() => pick(k.id)}>{k.label}</Chip>)}</div>}
        <p className="hint">{editing ? 'The old values are kept in the activity log.' : `${KINDS.find((k) => k.id === kind)!.hint} Balance now ${money(balance)}.`}</p>
        <div className="grid2">
          <Field label="Amount (₹)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} aria-invalid={!!err} hint={err || undefined} />
          <DatePicker label="Date" value={date} onChange={(v) => v && setDate(v)} today={false} />
        </div>
        {kind !== 'writeoff' && kind !== 'tds' && <Select label={kind === 'refund' ? 'How you refunded' : 'How they paid'} value={method} onChange={setMethod} options={[{ value: 'upi', label: 'UPI' }, { value: 'bank', label: 'Bank transfer' }, { value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' }, { value: 'card', label: 'Card' }, { value: 'other', label: 'Other' }]} />}
        <Field label="Reference (optional)" value={ref} maxLength={80} onChange={(e) => setRef(e.target.value)} placeholder={kind === 'tds' ? 'Certificate or challan number' : 'UPI reference or cheque number'} />
        <Field label="Note (optional)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth remembering" />
        <Button variant="primary" block disabled={busy || !!err} onClick={() => onSave(editing ? { amount: val, method: kind === 'tds' || kind === 'writeoff' ? 'other' : method, ref, note, paidAt: fromDateInput(date) } : { kind, amount: val, method: kind === 'tds' || kind === 'writeoff' ? 'other' : method, ref, note, paidAt: fromDateInput(date) })}>{editing ? 'Save changes' : `Save ${KINDS.find((k) => k.id === kind)!.label.toLowerCase()}`}</Button>
      </div>
    </Dialog>
  )
}

/* Removing a payment keeps it on the record, struck through, with the reason. */
export function RemovePaymentDialog({ open, onClose, payment, busy, onConfirm }: { open: boolean; onClose: () => void; payment: Payment | null; busy: boolean; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <Dialog open={open} onClose={() => { setReason(''); onClose() }} title="Remove this payment?">
      <div className="dlg-form">
        {payment && <p style={{ color: 'var(--text-2)' }}>The {money(payment.amount)} you recorded stops counting toward this invoice. It stays on the record as removed, and your client is told.</p>}
        <Field label="Why? (optional)" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="Cheque bounced, recorded twice, wrong invoice" />
        <Button variant="primary" block disabled={busy} onClick={() => { onConfirm(reason.trim()); setReason('') }}>Remove payment</Button>
        <Button variant="ghost" block onClick={() => { setReason(''); onClose() }}>Keep it</Button>
      </div>
    </Dialog>
  )
}
