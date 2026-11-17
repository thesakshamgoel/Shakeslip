import { Plus, Star, X } from 'lucide-react'
import { Button, IconButton } from './Button'
import type { Email, Phone } from '../lib/types'
export function ContactFields({ phones, emails, onChange }: { phones: Phone[]; emails: Email[]; onChange: (v: { phones?: Phone[]; emails?: Email[] }) => void }) {
  return <details className="contact-options"><summary>Additional phone numbers and emails</summary><p className="hint">Optional. Label each contact and star the default to show on new invoices. Your sign-in email stays unchanged.</p>
    <div className="contact-list"><h4>Phone numbers</h4>{phones.map((p, i) => <div className="contact-row" key={p.id}>
      <IconButton type="button" label={`Default phone ${i + 1}`} aria-pressed={p.isDefault} className={p.isDefault ? 'star on' : 'star'} onClick={() => onChange({ phones: phones.map((x) => ({ ...x, isDefault: x.id === p.id })) })}><Star size={17} /></IconButton>
      <input className="input" aria-label={`Phone ${i + 1} label`} placeholder="Office / Payments" maxLength={30} value={p.label} onChange={(e) => onChange({ phones: phones.map((x) => x.id === p.id ? { ...x, label: e.target.value } : x) })} />
      <input className="input" aria-label={`Phone ${i + 1} number`} placeholder="+91…" type="tel" maxLength={20} value={p.number} onChange={(e) => onChange({ phones: phones.map((x) => x.id === p.id ? { ...x, number: e.target.value } : x) })} />
      <IconButton type="button" label={`Remove phone ${i + 1}`} onClick={() => { const next = phones.filter((x) => x.id !== p.id); if (p.isDefault && next[0]) next[0] = { ...next[0], isDefault: true }; onChange({ phones: next }) }}><X size={17} /></IconButton>
    </div>)}<Button type="button" disabled={phones.length >= 8} onClick={() => onChange({ phones: [...phones, { id: crypto.randomUUID(), label: 'Office', number: '', isDefault: !phones.length }] })}><Plus size={16} />Add phone</Button></div>
    <div className="contact-list"><h4>Email addresses</h4>{emails.map((p, i) => <div className="contact-row" key={p.id}>
      <IconButton type="button" label={`Default email ${i + 1}`} aria-pressed={p.isDefault} className={p.isDefault ? 'star on' : 'star'} onClick={() => onChange({ emails: emails.map((x) => ({ ...x, isDefault: x.id === p.id })) })}><Star size={17} /></IconButton>
      <input className="input" aria-label={`Email ${i + 1} label`} placeholder="Billing / Office" maxLength={30} value={p.label} onChange={(e) => onChange({ emails: emails.map((x) => x.id === p.id ? { ...x, label: e.target.value } : x) })} />
      <input className="input" aria-label={`Email ${i + 1} address`} placeholder="billing@example.com" type="email" maxLength={120} value={p.address} onChange={(e) => onChange({ emails: emails.map((x) => x.id === p.id ? { ...x, address: e.target.value } : x) })} />
      <IconButton type="button" label={`Remove email ${i + 1}`} onClick={() => { const next = emails.filter((x) => x.id !== p.id); if (p.isDefault && next[0]) next[0] = { ...next[0], isDefault: true }; onChange({ emails: next }) }}><X size={17} /></IconButton>
    </div>)}<Button type="button" disabled={emails.length >= 8} onClick={() => onChange({ emails: [...emails, { id: crypto.randomUUID(), label: 'Billing', address: '', isDefault: !emails.length }] })}><Plus size={16} />Add email</Button></div>
  </details>
}
