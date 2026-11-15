import { motion } from 'motion/react'
import { useState } from 'react'
import { ImageUpload } from '../components/ImageUpload'
import { errText, put } from '../lib/api'
import { spring } from '../lib/motion'
import { useSession } from '../lib/session'
import { useToast } from '../lib/toast'

const SIZES = [{ id: 's', label: 'Small' }, { id: 'm', label: 'Default' }, { id: 'l', label: 'Large' }, { id: 'xl', label: 'Max' }] as const

/* Your logo, at one of four sizes, like the original. The mini letterhead shows the size live. */
export function LogoPicker() {
  const { me, refresh } = useSession()
  const b = me!.business!
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const size = b.logoSize ?? 'm'
  async function save(image: string, s: string) {
    if (busy) return
    setBusy(true)
    try { await put('/studio/logo', { image, size: s }); await refresh(); toast.ok(image ? 'Logo saved. It appears on new invoices.' : 'Logo removed.') } catch (e) { toast.bad(errText(e)) } finally { setBusy(false) }
  }
  return (
    <section className="ed-sec">
      <h2>Logo</h2>
      <div className="logo-grid">
        <ImageUpload label="Your logo" value={b.logo ?? ''} busy={busy} onChange={(v) => save(v, size)} hint="PNG with a transparent background looks best. Any image is resized for you." />
        <div className="logo-prev" aria-hidden>
          <div className="lp-paper">
            {b.logo ? <motion.img layout src={b.logo} alt="" style={{ height: { s: 18, m: 26, l: 34, xl: 44 }[size] }} transition={spring} /> : <span className="lp-ph">Logo</span>}
            <b>{b.name}</b><i /><i /><i />
          </div>
        </div>
      </div>
      <div className="seg3" role="radiogroup" aria-label="Logo size">
        {SIZES.map((s) => (
          <button key={s.id} role="radio" aria-checked={size === s.id} className="seg3-b tap" disabled={!b.logo || busy} onClick={() => save(b.logo ?? '', s.id)}>
            {size === s.id && <motion.span layoutId="logo-size" className="seg3-pill" transition={spring} />}<span>{s.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
