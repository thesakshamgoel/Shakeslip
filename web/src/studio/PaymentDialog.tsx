import { useState } from 'react'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { DatePicker } from '../components/DatePicker'
import { Dialog } from '../components/Dialog'
import { Field } from '../components/Field'
import { Select } from '../components/Select'
import { fromDateInput, toDateInput } from '../lib/dates'
import { money, rupees, toPaise } from '../lib/money'

export type PayKind = 'payment' | 'advance' | 'tds' | 'writeoff' | 'refund'
const KINDS: { id: PayKind; label: string; hint: string }[] = [
  { id: 'payment', label: 'Payment', hint: 'Money received against this invoice.' },
  { id: 'advance', label: 'Advance', hint: 'Received before the work is done.' },
  { id: 'tds', label: 'TDS deducted', hint: 'Tax your client deducted at source. Ask them for Form 16A.' },
  { id: 'writeoff', label: 'Write-off', hint: 'An amount you agree not to collect.' },
  { id: 'refund', label: 'Refund', hint: 'Money you returned. It is added back to the balance.' },
]

/* Every way money moves on an invoice, each with an optional note, so the record stays honest. */
export function PaymentDialog({ open, onClose, balance, paid, busy, onSave }: { open: boolean; onClose: () => void; balance: number; paid: number; busy: boolean; onSave: (b: Record<string, unknown>) => void }) {
  const [kind, setKind] = useState<PayKind>('payment')
  const [amount, setAmount] = useState(rupees(balance))
  const [method, setMethod] = useState('upi')
  const [date, setDate] = useState(toDateInput(new Date().toISOString()))
  const [ref, setRef] = useState('')
  const [note, setNote] = useState('')
  const max = kind === 'refund' ? paid : balance
  const val = toPaise(amount)
  const err = val <= 0 ? 'Enter an amount.' : val > max ? `That is more than ${kind === 'refund' ? 'was paid' : 'the balance'} (${money(max)}).` : ''
  const pick = (k: PayKind) => { setKind(k); setAmount(rupees(k === 'refund' ? 0 : k === 'tds' ? Math.round(balance * 0.1) : balance)) }
  return (
    <Dialog open={open} onClose={onClose} title="Record money in or out">
      <div className="dlg-form">
        <div className="chips2" role="radiogroup" aria-label="What happened">{KINDS.map((k) => <Chip key={k.id} icon={false} on={kind === k.id} onClick={() => pick(k.id)}>{k.label}</Chip>)}</div>
        <p className="hint">{KINDS.find((k) => k.id === kind)!.hint} Balance now {money(balance)}.</p>
        <div className="grid2">
          <Field label="Amount (₹)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} aria-invalid={!!err} hint={err || undefined} />
          <DatePicker label="Date" value={date} onChange={(v) => v && setDate(v)} today={false} />
        </div>
        {kind !== 'writeoff' && kind !== 'tds' && <Select label={kind === 'refund' ? 'How you refunded' : 'How they paid'} value={method} onChange={setMethod} options={[{ value: 'upi', label: 'UPI' }, { value: 'bank', label: 'Bank transfer' }, { value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' }, { value: 'card', label: 'Card' }, { value: 'other', label: 'Other' }]} />}
        <Field label="Reference (optional)" value={ref} maxLength={80} onChange={(e) => setRef(e.target.value)} placeholder={kind === 'tds' ? 'Certificate or challan number' : 'UPI reference or cheque number'} />
        <Field label="Note (optional)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth remembering" />
        <Button variant="primary" block disabled={busy || !!err} onClick={() => onSave({ kind, amount: val, method: kind === 'tds' || kind === 'writeoff' ? 'other' : method, ref, note, paidAt: fromDateInput(date) })}>Save {KINDS.find((k) => k.id === kind)!.label.toLowerCase()}</Button>
      </div>
    </Dialog>
  )
}
