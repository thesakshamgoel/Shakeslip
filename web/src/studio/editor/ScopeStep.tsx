import { Plus, Sparkles } from 'lucide-react'
import { DatePicker } from '../../components/DatePicker'
import { Select } from '../../components/Select'
import { useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { Field } from '../../components/Field'
import { inr } from '../../lib/money'
import { professionOf } from '../../lib/professions'
import { useSession } from '../../lib/session'
import { BANNER_PREFIXES, CATEGORIES, ITEM_PREFIXES, jobSentence, listJoin } from '../../lib/scope'
import type { InvoiceType } from '../../lib/types'
import { blankLine, type Memory } from './ItemsStep'
import type { Draft } from './state'

/* The original Shakeslip scope builder: tap services, and the first line and the banner write themselves. */
export function ScopeStep({ d, set, memory, profession, services, setServices }: { d: Draft; set: (p: Partial<Draft>, m?: string) => void; type: InvoiceType; memory: Memory[]; profession: string; services: string[]; setServices: (s: string[]) => void }) {
  const prof = professionOf(profession)
  const [custom, setCustom] = useState('')
  const [mode, setMode] = useState<'one' | 'each'>('one')
  const [itemPre, setItemPre] = useState<string>(ITEM_PREFIXES[0])
  const [bannerPre, setBannerPre] = useState<string>(BANNER_PREFIXES[0])
  const cat = useSession().me?.business?.catalogue ?? { services: [], packages: [] }
  const catalogued = [...cat.services].sort((a, b) => Number(!!b.fav) - Number(!!a.fav))
  const catOf = (s: string) => cat.services.find((c) => c.name === s)
  const all = [...new Set([...catalogued.map((c) => c.name), ...prof.services, ...services])]
  const packLine = (k: (typeof cat.packages)[number]) => `${k.name} (${cat.services.filter((c) => k.includes.includes(c.id)).map((c) => c.name).join(', ')})`.replace(' ()', '')
  function togglePack(k: (typeof cat.packages)[number]) {
    const desc = packLine(k), has = d.items.some((i) => i.desc === desc)
    const rest = d.items.filter((i) => i.desc !== desc && (i.desc.trim() || i.rate))
    set({ items: has ? (rest.length ? rest : [blankLine()]) : [...rest, { ...blankLine(), desc, qty: 1, rate: k.price, unit: 'package' }], project: d.project || k.name }, 'pack')
  }
  const [jobOn, setJobOn] = useState(false)
  const job = d.extra.job ?? { what: '', kind: '', name: '' }
  /* turning the switch off by accident must not lose the words: they are kept and come back when it is turned on again */
  const SK = 'ss-job-stash'
  const stash = useRef<typeof job | null>(null)
  if (stash.current === null) { try { stash.current = JSON.parse(sessionStorage.getItem(SK) ?? 'null') } catch { stash.current = null } }
  if (job.what || job.kind || job.name) { stash.current = job; try { sessionStorage.setItem(SK, JSON.stringify(job)) } catch { /* storage may be off */ } }
  const sentence = jobSentence(job)
  /* the named job becomes the project, the banner and the first line, so the invoice points at exactly this work */
  function setJob(p: Partial<typeof job>) {
    const next = { ...job, ...p }, s = jobSentence(next)
    const first = d.items[0]
    const items = first && (!first.desc.trim() || first.desc === sentence) ? [{ ...first, desc: s }, ...d.items.slice(1)] : d.items
    set({ project: s || d.project, items, extra: { ...d.extra, job: next, banner: s ? `Invoice towards ${s.charAt(0).toLowerCase()}${s.slice(1)}.` : d.extra.banner } }, 'job')
  }

  function write(list: string[], m = mode, ip = itemPre, bp = bannerPre) {
    if (!list.length) return
    const rateOf = (s: string) => catOf(s)?.rate ?? memory.find((x) => x.desc.toLowerCase().includes(s.toLowerCase()))?.rate ?? 0
    /* one line: the sum of your set rates, unless you already typed your own */
    const sumOf = (l: string[]) => l.reduce((n, s) => n + (catOf(s)?.rate ?? 0), 0)
    const oneRate = (l: string[]) => { const cur = d.items[0]?.rate ?? 0; return !cur || cur === sumOf(services) ? sumOf(l) : cur }
    const items = m === 'one'
      ? [{ ...(d.items[0] ?? blankLine()), desc: `${ip} ${listJoin(list)}`, rate: oneRate(list) }, ...d.items.slice(1).filter((i) => !list.some((s) => i.desc === s))]
      : list.map((s) => d.items.find((i) => i.desc === s) ?? { ...blankLine(), desc: s, rate: rateOf(s), unit: catOf(s)?.unit ?? '' })
    set({ items, extra: { ...d.extra, banner: `${bp} ${listJoin(list)}.` } })
  }
  function toggle(s: string) { const next = services.includes(s) ? services.filter((x) => x !== s) : [...services, s]; setServices(next); write(next) }

  return (
    <div className="st">
      <div className="st-block">
        <div className="st-row"><h3>What did you do?</h3><span className="hint">{services.length ? `${services.length} selected` : 'Tap to add'}</span></div>
        <div className="chips2">{all.map((s) => { const c = catOf(s); return <Chip key={s} on={services.includes(s)} onClick={() => toggle(s)}>{s}{c?.rate ? <small className="chip-rate num">{inr(c.rate)}{c.unit ? `/${c.unit}` : ''}</small> : null}</Chip> })}</div>
        {cat.packages.length > 0 && (<>
          <small className="st-sub">Packages</small>
          <div className="chips2">{cat.packages.map((k) => <Chip key={k.id} on={d.items.some((i) => i.desc === packLine(k))} onClick={() => togglePack(k)}>{k.name}<small className="chip-rate num">{inr(k.price)}</small></Chip>)}</div>
        </>)}
        {!cat.services.length && <p className="hint">Save what you charge in Settings → Services and rates, and rates fill in here.</p>}
        <form className="inline-add" onSubmit={(e) => { e.preventDefault(); const v = custom.trim(); if (v && !services.includes(v)) { toggle(v); setCustom('') } }}>
          <input className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add your own service" maxLength={40} aria-label="Add your own service" />
          <Button type="submit" disabled={!custom.trim()}><Plus size={16} aria-hidden />Add</Button>
        </form>
        <div className="roles">
          <button type="button" className="role tap" aria-pressed={mode === 'one'} onClick={() => { setMode('one'); write(services, 'one') }}><b>One line</b><span>"{ITEM_PREFIXES[0]} A, B and C"</span></button>
          <button type="button" className="role tap" aria-pressed={mode === 'each'} onClick={() => { setMode('each'); write(services, 'each') }}><b>A line per service</b><span>Each with its own rate</span></button>
        </div>
        <div className="grid2">
          <Select custom label="Line wording" value={itemPre} onChange={(v) => { setItemPre(v); write(services, mode, v) }} options={ITEM_PREFIXES.map((p) => ({ value: p, label: p }))} />
          <Select custom label="Banner wording" value={bannerPre} onChange={(v) => { setBannerPre(v); write(services, mode, itemPre, v) }} options={BANNER_PREFIXES.map((p) => ({ value: p, label: p }))} />
        </div>
      </div>
      <div className="st-block">
        <label className="switch-row"><span><b>Name the exact job</b><small>For example: Editing of the music video "Raat ko Jaagoon"</small></span><input type="checkbox" role="switch" checked={!!d.extra.job?.name || jobOn} onChange={(e) => { setJobOn(e.target.checked); if (!e.target.checked) set({ extra: { ...d.extra, job: { what: '', kind: '', name: '' } } }); else if (stash.current && !(job.what || job.kind || job.name)) setJob(stash.current) }} /></label>
        {(jobOn || !!d.extra.job?.name) && (<>
          <div className="job-f">
            <Field label="What you did" value={job.what} placeholder="Editing" onChange={(e) => setJob({ what: e.target.value })} />
            <Field label="Of a" value={job.kind} placeholder="music video" onChange={(e) => setJob({ kind: e.target.value })} />
            <Field label="Named" value={job.name} placeholder="Raat ko Jaagoon" onChange={(e) => setJob({ name: e.target.value })} />
          </div>
          {sentence && <p className="explain"><Sparkles size={15} aria-hidden /><span>On the invoice: <b>{sentence}</b>. It goes into the project title, the banner and the first line.</span></p>}
        </>)}
      </div>
      <div className="st-block">
        <h3>Project</h3>
        <Field label="Project or work title" value={d.project} maxLength={200} placeholder="For example, Monsoon brand film" onChange={(e) => set({ project: e.target.value }, 'project')} />
        <div className="grid2">
          <Select custom label="Deliverable category" value={d.extra.category} onChange={(v) => set({ extra: { ...d.extra, category: v } })} options={CATEGORIES.map((c) => ({ value: c, label: c || 'None' }))} />
          <DatePicker label="Shoot or completion date" value={d.extra.completionDate} onChange={(v) => set({ extra: { ...d.extra, completionDate: v } })} />
        </div>
        <label className="field"><span>Banner on the invoice</span><textarea className="input" rows={2} value={d.extra.banner} maxLength={300} placeholder="Invoice towards Professional Charges for..." onChange={(e) => set({ extra: { ...d.extra, banner: e.target.value } }, 'banner')} /></label>
        {!d.extra.banner && services.length === 0 && d.project && <Button variant="ghost" onClick={() => set({ extra: { ...d.extra, banner: `${bannerPre} ${d.project}.` } })}><Sparkles size={16} aria-hidden />Write a banner from the title</Button>}
      </div>
    </div>
  )
}
