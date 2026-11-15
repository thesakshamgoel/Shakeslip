import { AnimatePresence, motion } from 'motion/react'
import { Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, IconButton } from '../../components/Button'
import { errText, put } from '../../lib/api'
import { springSoft } from '../../lib/motion'
import { useSession } from '../../lib/session'
import { useToast } from '../../lib/toast'
import type { Email } from '../../lib/types'

/* Several labelled emails. The starred one prints by default; each invoice can pick others, per client. */
export function EmailsCard() {
  const { me, refresh } = useSession()
  const b = me!.business!
  const toast = useToast()
  const [list, setList] = useState<Email[]>(b.emails?.length ? b.emails : b.email ? [{ id: crypto.randomUUID().slice(0, 12), label: 'Main', address: b.email, isDefault: true }] : [])
  const set = (id: string, p: Partial<Email>) => setList((l) => l.map((x) => (x.id === id ? { ...x, ...p } : p.isDefault ? { ...x, isDefault: false } : x)))
  async function save() {
    if (list.some((x) => !x.label.trim() || !/^\S+@\S+\.\S+$/.test(x.address.trim()))) { toast.bad('Give every email a label and a valid address.'); return }
    try { await put('/studio/emails', { emails: list }); await refresh(); toast.ok('Emails saved.') } catch (x) { toast.bad(errText(x)) }
  }
  return (
    <section className="set-card">
      <header><h2>Contact emails</h2><p>Add the addresses clients may write to. The starred one prints by default; on any invoice you can tick others, and it is remembered for each client.</p></header>
      <ul className="phones">
        <AnimatePresence initial={false}>
          {list.map((x) => (
            <motion.li key={x.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={springSoft}>
              <IconButton label={x.isDefault ? 'Default email' : 'Make default'} className={x.isDefault ? 'star on' : 'star'} onClick={() => set(x.id, { isDefault: true })}><Star size={17} /></IconButton>
              <input className="input" value={x.label} maxLength={30} onChange={(e) => set(x.id, { label: e.target.value })} aria-label="Label" placeholder="Accounts" />
              <input className="input" type="email" value={x.address} maxLength={120} inputMode="email" onChange={(e) => set(x.id, { address: e.target.value })} aria-label="Email" placeholder="accounts@yourbusiness.in" />
              <IconButton label="Remove email" onClick={() => setList((l) => l.filter((y) => y.id !== x.id))}><Trash2 size={17} /></IconButton>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <footer className="split-f">
        <Button variant="ghost" disabled={list.length >= 8} onClick={() => setList((l) => [...l, { id: crypto.randomUUID().slice(0, 12), label: ['Main', 'Accounts', 'Support', 'Other'][l.length] ?? 'Other', address: '', isDefault: l.length === 0 }])}><Plus size={17} aria-hidden />Add an email</Button>
        <Button variant="primary" onClick={save}>Save emails</Button>
      </footer>
    </section>
  )
}
