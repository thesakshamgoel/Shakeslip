import { AnimatePresence, motion } from 'motion/react'
import { Plus, Star, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button, IconButton } from '../../components/Button'
import { Field } from '../../components/Field'
import { ImageUpload } from '../../components/ImageUpload'
import { errText, put } from '../../lib/api'
import { springSoft } from '../../lib/motion'
import { useSession } from '../../lib/session'
import { useToast } from '../../lib/toast'
import type { Phone } from '../../lib/types'
import { EmailsCard } from './EmailsCard'
import { saveBusiness } from './save'

/* Bank, UPI, your own QR image, and labelled payment numbers. */
export function PaySection() {
  const { me, refresh } = useSession()
  const b = me!.business!
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [phones, setPhones] = useState<Phone[]>(b.phones?.length ? b.phones : b.phone ? [{ id: crypto.randomUUID(), label: 'Payments', number: b.phone, isDefault: true }] : [])
  async function saveBank(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const f = new FormData(e.currentTarget), v = (k: string) => String(f.get(k) ?? '').trim()
    setBusy(true)
    try { await saveBusiness(me!, { upiId: v('upiId'), bankName: v('bankName'), accountName: v('accountName'), accountNo: v('accountNo').replace(/\s/g, ''), ifsc: v('ifsc').toUpperCase() }); await refresh(); toast.ok('Payment details saved.') } catch (x) { toast.bad(errText(x)) } finally { setBusy(false) }
  }
  async function savePhones() {
    if (phones.some((p) => !p.label.trim() || p.number.replace(/\D/g, '').length < 6)) { toast.bad('Give every number a label and at least 6 digits.'); return }
    try { await put('/studio/phones', { phones }); await refresh(); toast.ok('Numbers saved.') } catch (x) { toast.bad(errText(x)) }
  }
  const setP = (id: string, p: Partial<Phone>) => setPhones((l) => l.map((x) => (x.id === id ? { ...x, ...p } : p.isDefault ? { ...x, isDefault: false } : x)))
  return (
    <>
      <form className="set-card" onSubmit={saveBank}>
        <header><h2>Bank and UPI</h2><p>Printed in the payment block. With a UPI ID, every invoice gets a scan-to-pay QR with the exact amount.</p></header>
        <div className="grid2">
          <Field label="UPI ID" name="upiId" defaultValue={b.upiId} placeholder="yourname@okhdfc" autoCapitalize="none" />
          <Field label="Account name" name="accountName" defaultValue={b.accountName} />
          <Field label="Bank" name="bankName" defaultValue={b.bankName} />
          <Field label="Account number" name="accountNo" defaultValue={b.accountNo} inputMode="numeric" />
          <Field label="IFSC" name="ifsc" defaultValue={b.ifsc} maxLength={11} autoCapitalize="characters" />
        </div>
        <footer><Button variant="primary" type="submit" disabled={busy}>{busy ? 'Saving' : 'Save bank and UPI'}</Button></footer>
      </form>
      <section className="set-card">
        <header><h2>Your QR image</h2><p>Optional. Upload the QR from your bank or UPI app if you prefer it. Each invoice lets you choose this, the generated UPI QR, or none.</p></header>
        <ImageUpload label="Payment QR" value={b.qrImage ?? ''} onChange={async (v) => { try { await put('/studio/qr', { image: v }); await refresh(); toast.ok(v ? 'QR saved.' : 'QR removed.') } catch (x) { toast.bad(errText(x)) } }} />
      </section>
      <section className="set-card">
        <header><h2>Payment numbers</h2><p>Add the numbers clients may pay or call on. The starred one prints by default; you can pick another per invoice.</p></header>
        <ul className="phones">
          <AnimatePresence initial={false}>
            {phones.map((p) => (
              <motion.li key={p.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={springSoft}>
                <IconButton label={p.isDefault ? 'Default number' : 'Make default'} className={p.isDefault ? 'star on' : 'star'} onClick={() => setP(p.id, { isDefault: true })}><Star size={17} /></IconButton>
                <input className="input" value={p.label} maxLength={30} onChange={(e) => setP(p.id, { label: e.target.value })} aria-label="Label" placeholder="Payments" />
                <input className="input num" value={p.number} maxLength={20} inputMode="tel" onChange={(e) => setP(p.id, { number: e.target.value })} aria-label="Number" placeholder="+91 98765 43210" />
                <IconButton label="Remove number" onClick={() => setPhones((l) => l.filter((x) => x.id !== p.id))}><Trash2 size={17} /></IconButton>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <footer className="split-f">
          <Button variant="ghost" disabled={phones.length >= 8} onClick={() => setPhones((l) => [...l, { id: crypto.randomUUID(), label: ['Payments', 'Office', 'WhatsApp', 'Accounts'][l.length] ?? 'Other', number: '', isDefault: l.length === 0 }])}><Plus size={17} aria-hidden />Add a number</Button>
          <Button variant="primary" onClick={savePhones}>Save numbers</Button>
        </footer>
      </section>
      <EmailsCard />
    </>
  )
}
