import { AnimatePresence, motion } from 'motion/react'
import { Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, IconButton } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { errText, put } from '../../lib/api'
import { inr, rupees, toPaise } from '../../lib/money'
import { springSoft } from '../../lib/motion'
import { useSession } from '../../lib/session'
import { useToast } from '../../lib/toast'
import type { CatPackage, CatService } from '../../lib/types'

const UNITS = ['hour', 'day', 'project', 'video', 'photo', 'month']
const newId = () => crypto.randomUUID().slice(0, 12)

/* Your services with set rates, and packages that bundle them at one price. They appear as chips in the editor. */
export function CatalogueSection() {
  const { me, refresh } = useSession()
  const toast = useToast()
  const cat = me?.business?.catalogue ?? { services: [], packages: [] }
  const [services, setServices] = useState<(CatService & { rateText: string })[]>(cat.services.map((s) => ({ ...s, rateText: s.rate ? rupees(s.rate) : '' })))
  const [packages, setPackages] = useState<(CatPackage & { priceText: string })[]>(cat.packages.map((k) => ({ ...k, priceText: k.price ? rupees(k.price) : '' })))
  const [busy, setBusy] = useState(false)
  const setS = (id: string, p: Partial<CatService & { rateText: string }>) => setServices((l) => l.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const setP = (id: string, p: Partial<CatPackage & { priceText: string }>) => setPackages((l) => l.map((k) => (k.id === id ? { ...k, ...p } : k)))
  const named = services.filter((s) => s.name.trim())

  async function save() {
    if (busy) return
    setBusy(true)
    try {
      await put('/studio/catalogue', {
        services: named.map(({ rateText, ...s }) => ({ ...s, name: s.name.trim(), rate: toPaise(rateText) })),
        packages: packages.filter((k) => k.name.trim()).map(({ priceText, ...k }) => ({ ...k, name: k.name.trim(), price: toPaise(priceText) })),
      })
      await refresh(); toast.ok('Services saved. They show up when you create an invoice.')
    } catch (x) { toast.bad(errText(x)) } finally { setBusy(false) }
  }
  const sum = (k: CatPackage) => named.filter((s) => k.includes.includes(s.id)).reduce((n, s) => n + toPaise(s.rateText), 0)

  return (
    <>
      <section className="set-card">
        <header><h2>Services and rates</h2><p>What you sell and what you usually charge. Pick them in the Work step and the line, unit and rate fill in. Star the ones you use most.</p></header>
        <div className="cat-list">
          <AnimatePresence initial={false}>
            {services.map((s) => (
              <motion.div key={s.id} className="cat-row" layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={springSoft}>
                <IconButton label={s.fav ? 'Remove star' : 'Star this service'} className={s.fav ? 'on' : ''} onClick={() => setS(s.id, { fav: !s.fav })}><Star size={17} fill={s.fav ? 'currentColor' : 'none'} /></IconButton>
                <input className="input" aria-label="Service name" placeholder="Service, e.g. Shoot day" value={s.name} maxLength={80} onChange={(e) => setS(s.id, { name: e.target.value })} />
                <label className="cat-rate"><span aria-hidden>₹</span><input className="input num" aria-label="Rate in rupees" inputMode="decimal" placeholder="Rate" value={s.rateText} onChange={(e) => setS(s.id, { rateText: e.target.value.replace(/[^\d.]/g, '') })} /></label>
                <IconButton label={`Remove ${s.name || 'service'}`} onClick={() => { setServices((l) => l.filter((x) => x.id !== s.id)); setPackages((l) => l.map((k) => ({ ...k, includes: k.includes.filter((i) => i !== s.id) }))) }}><Trash2 size={17} /></IconButton>
                <div className="cat-unit"><span>per</span>
                  <div className="chips2 cat-units">{UNITS.map((u) => <Chip key={u} icon={false} on={s.unit === u} onClick={() => setS(s.id, { unit: s.unit === u ? '' : u })}>{u}</Chip>)}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {!services.length && <p className="hint">No services yet. Add the things you charge for most often.</p>}
        <Button variant="ghost" onClick={() => setServices((l) => [...l, { id: newId(), name: '', unit: '', rate: 0, rateText: '', fav: false }])}><Plus size={17} aria-hidden />Add a service</Button>
      </section>

      <section className="set-card">
        <header><h2>Packages</h2><p>A few services sold together at one price, like "Wedding film: shoot, edit and colour". It goes on the invoice as one line.</p></header>
        {packages.map((k) => (
          <div key={k.id} className="cat-pack">
            <div className="cat-row cat-row-p">
              <input className="input" aria-label="Package name" placeholder="Package name" value={k.name} maxLength={80} onChange={(e) => setP(k.id, { name: e.target.value })} />
              <label className="cat-rate"><span aria-hidden>₹</span><input className="input num" aria-label="Package price in rupees" inputMode="decimal" placeholder="Price" value={k.priceText} onChange={(e) => setP(k.id, { priceText: e.target.value.replace(/[^\d.]/g, '') })} /></label>
              <IconButton label={`Remove ${k.name || 'package'}`} onClick={() => setPackages((l) => l.filter((x) => x.id !== k.id))}><Trash2 size={17} /></IconButton>
            </div>
            <div className="chips2">{named.map((s) => <Chip key={s.id} on={k.includes.includes(s.id)} onClick={() => setPackages((l) => l.map((x) => (x.id !== k.id ? x : { ...x, includes: x.includes.includes(s.id) ? x.includes.filter((i) => i !== s.id) : [...x.includes, s.id] })))}>{s.name}</Chip>)}</div>
            {k.includes.length > 0 && <small className="hint num">Separately {inr(sum(k))}{k.priceText && sum(k) > toPaise(k.priceText) ? `, so the package saves your client ${inr(sum(k) - toPaise(k.priceText))}` : ''}.</small>}
          </div>
        ))}
        <Button variant="ghost" disabled={!named.length} onClick={() => setPackages((l) => [...l, { id: newId(), name: '', price: 0, priceText: '', includes: [] }])}><Plus size={17} aria-hidden />{named.length ? 'Add a package' : 'Add services first'}</Button>
      </section>
      <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving' : 'Save services'}</Button>
    </>
  )
}
