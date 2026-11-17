import { ContactFields } from '../components/ContactFields'
import { AnimatePresence, motion } from 'motion/react'
import { STATE_OPTIONS } from '../lib/gst'
import { Select } from '../components/Select'
import { ClipboardPaste, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Field } from '../components/Field'
import { ImageUpload } from '../components/ImageUpload'
import { gstinValid, STATES } from '../lib/gst'
import { springSoft } from '../lib/motion'
import { parseContact } from '../lib/smartPaste'
import type { Honorific, Phone, Email } from '../lib/types'

export type ClientForm = { phones?: Phone[]; emails?: Email[]; name: string; company: string; email: string; phone: string; honorific: Honorific; attention: string; gstin: string; pan: string; address: string; area: string; city: string; pin: string; state: string; logo: string }
export const emptyClient = (): ClientForm => ({ name: '', company: '', email: '', phone: '', honorific: '', attention: '', gstin: '', pan: '', address: '', area: '', city: '', pin: '', state: '', logo: '' })
const TITLES: Honorific[] = ['', 'Mr.', 'Ms.', 'Mrs.', 'Dr.', 'M/s.']

export function ClientFields({ v, set, logo = true }: { v: ClientForm; set: (p: Partial<ClientForm>) => void; logo?: boolean }) {
  const [paste, setPaste] = useState(false)
  const [raw, setRaw] = useState('')
  const [found, setFound] = useState<string[]>([])
  const gBad = v.gstin.length > 0 && !gstinValid(v.gstin)
  function fill() {
    const p = parseContact(raw)
    const keys = Object.keys(p) as (keyof typeof p)[]
    set(Object.fromEntries(keys.map((k) => [k, p[k]])) as Partial<ClientForm>)
    setFound(keys); setPaste(false); setRaw('')
  }
  return (
    <div className="cf">
      <div className="cf-paste">
        <Button variant="ghost" onClick={() => setPaste((x) => !x)}><ClipboardPaste size={16} aria-hidden />Paste their details</Button>
        <AnimatePresence initial={false}>
          {paste && (
            <motion.div className="cf-paste-box" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={springSoft}>
              <textarea className="input" rows={5} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={'Paste an email signature, a WhatsApp message or a letterhead.\nWe pick out the name, company, email, phone, GSTIN, PAN and PIN.'} aria-label="Paste client details" autoFocus />
              <Button variant="primary" disabled={!raw.trim()} onClick={fill}><Sparkles size={16} aria-hidden />Fill the form</Button>
            </motion.div>
          )}
        </AnimatePresence>
        {found.length > 0 && <p className="cf-found" role="status">Filled in {found.length} {found.length === 1 ? 'field' : 'fields'}: {found.join(', ')}. Check them before saving.</p>}
      </div>
      {logo && <ImageUpload label="Client logo (optional)" value={v.logo} onChange={(x) => set({ logo: x })} hint="Shows next to their name in the Bill to block." />}
      <div className="field"><span>Title</span><div className="chips2">{TITLES.map((t) => <Chip key={t || 'none'} icon={false} on={v.honorific === t} onClick={() => set({ honorific: t })}>{t || 'None'}</Chip>)}</div></div>
      <div className="grid2">
        <Field label="Contact person" value={v.name} onChange={(e) => set({ name: e.target.value })} required autoComplete="off" />
        <Field label="Company (optional)" value={v.company} onChange={(e) => set({ company: e.target.value })} autoComplete="off" />
        <Field label="Email" type="email" inputMode="email" value={v.email} onChange={(e) => set({ email: e.target.value.trim() })} autoComplete="off" />
        <Field label="WhatsApp number" type="tel" inputMode="tel" value={v.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+91 98765 43210" autoComplete="off" />
        <Field label="GSTIN" value={v.gstin} maxLength={15} onChange={(e) => { const g = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15); set({ gstin: g, ...(g.length === 15 && gstinValid(g) ? { state: g.slice(0, 2), pan: g.slice(2, 12) } : {}) }) }} aria-invalid={gBad} hint={gBad ? 'This does not pass the GSTIN check digit.' : v.gstin.length === 15 ? `Checks out: ${STATES[v.gstin.slice(0, 2)]}` : 'Optional. We read the state and PAN from it.'} />
        <Field label="PAN" value={v.pan} maxLength={10} onChange={(e) => set({ pan: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '') })} />
      </div>
      {v.company && <Field label="Kind attention (if not the contact person)" value={v.attention} onChange={(e) => set({ attention: e.target.value })} placeholder={v.name} />}
      <Field label="Address" value={v.address} onChange={(e) => set({ address: e.target.value })} autoComplete="off" />
      <div className="grid3">
        <Field label="Area" value={v.area} onChange={(e) => set({ area: e.target.value })} />
        <Field label="City" value={v.city} onChange={(e) => set({ city: e.target.value })} />
        <Field label="PIN" value={v.pin} inputMode="numeric" maxLength={6} onChange={(e) => set({ pin: e.target.value.replace(/\D/g, '') })} />
      </div>
      <ContactFields phones={v.phones ?? []} emails={v.emails ?? []} onChange={set} />
      <Select label="State" value={v.state} onChange={(x) => set({ state: x })} options={STATE_OPTIONS} disabled={v.gstin.length === 15 && gstinValid(v.gstin)} />
    </div>
  )
}
