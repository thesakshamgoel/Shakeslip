import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, FileDown, MessageCircle, Redo2, Save, Send, Undo2, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { autoMatch, suggestClauses } from '../lib/clauses'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, IconButton } from '../components/Button'
import { Dialog } from '../components/Dialog'
import { DocViewer } from '../components/DocViewer'
import { DEFAULT_EXTRA, docCtx, type DocData, type DocFocus } from '../components/InvoiceDocument'
import { errText, post, put } from '../lib/api'
import { downloadPdf } from '../lib/download'
import { setNavGuard } from '../lib/navguard'
import { liveTotals } from '../lib/format'
import { isInterState, stateOf } from '../lib/gst'
import { money } from '../lib/money'
import { spring, springSoft } from '../lib/motion'
import { useSession } from '../lib/session'
import { useToast } from '../lib/toast'
import type { Business, Group, InvoiceType, InvoiceView, Link as ClientLink } from '../lib/types'
import { useApi } from '../lib/useApi'
import { whatsappUrl } from '../lib/whatsapp'
import { AmountsStep } from './editor/AmountsStep'
import { ClientStep } from './editor/ClientStep'
import { blankLine, type Memory } from './editor/ItemsStep'
import { ScopeStep } from './editor/ScopeStep'
import { ClientDialog } from './ClientDialog'
import { InviteDialog } from './InviteDialog'
import { ReviewStep, reviewChecks } from './editor/ReviewStep'
import { salutationFor } from '../lib/scope'
import { isoIn, useDraft, type Draft } from './editor/state'
import { TermsStep } from './editor/TermsStep'
import { PaymentStep } from './editor/PaymentStep'
import { Banner } from '../components/Banner'
import { clearCarry, clearDraft, draftKey, readCarry, readDraft, writeCarry, writeDraft } from './editor/localDraft'
import { SendDialog, type SendOpts } from './editor/SendDialog'
import { useSwipeClaim } from '../mobile/swipe'
import TypePicker from './TypePicker'
import './editor/editor.css'

const BACK = '__back'
const STEPS = ['Client', 'Work', 'Amounts', 'Payment', 'Terms', 'Review'] as const
const FOCUS: DocFocus[] = ['bill', 'scope', 'items', 'totals', 'terms', '']
type Issue = { text: string; focus: DocFocus }

export default function Editor() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const types = useApi<InvoiceType[]>('/studio/types')
  const links = useApi<ClientLink[]>('/studio/links')
  const groups = useApi<Group[]>('/studio/groups')
  const memory = useApi<Memory[]>('/studio/invoices/items/suggest')
  const existing = useApi<InvoiceView>(id ? `/studio/invoices/${id}` : null)
  const [addFirst, setAddFirst] = useState(false)
  const typeId = id ? existing.data?.typeId : params.get('type') ?? (params.get('pick') ? undefined : groups.data?.find((g) => g.id === links.data?.find((l) => l.id === params.get('client'))?.groupId)?.typeId)
  if (!types.data || !links.data || !groups.data || (id && !existing.data)) return <div aria-busy="true" style={{ minHeight: 400 }} />
  const type = types.data.find((t) => t.id === typeId) ?? (id ? existing.data?.type : undefined)
  if (!type) return <TypePicker types={types.data} client={params.get('client')} />
  if (!links.data.length) return (
    <div className="empty"><h3>Add a client first</h3><p>An invoice needs someone to send it to. Invite a client by email or WhatsApp, or share your connect link.</p><Button variant="primary" onClick={() => setAddFirst(true)}><UserPlus size={18} aria-hidden />Add a client</Button>
      <InviteDialog open={addFirst} onClose={() => setAddFirst(false)} groups={groups.data} onDone={() => links.reload()} /></div>
  )
  return <Form key={`${type.id}-${id ?? 'new'}`} type={{ ...type, id: type.id ?? typeId ?? '' }} links={links.data} groups={groups.data} existing={existing.data} preClient={params.get('client')} memory={memory.data ?? []} reloadLinks={links.reload} />
}

function initial(type: InvoiceType, links: ClientLink[], groups: Group[], existing: InvoiceView | null, preClient: string | null, biz?: Business | null): Draft {
  if (existing) return { linkId: existing.linkId, theme: existing.theme, items: existing.items, fields: existing.fields, gstPct: existing.gstPct, taxInclusive: existing.taxInclusive, discount: existing.discount, advance: existing.advance, issued: existing.issued, due: existing.due, note: existing.note, project: existing.project, terms: existing.terms, extra: { ...DEFAULT_EXTRA, ...existing.extra } }
  const link = links.find((l) => l.id === preClient) ?? links.find((l) => l.status === 'active') ?? links[0]
  const g = groups.find((x) => x.id === link?.groupId)
  const now = new Date()
  return { linkId: link?.id ?? '', theme: g?.theme ?? biz?.defaultTheme ?? type.theme, items: [blankLine()], fields: {}, gstPct: type.taxMode === 'none' ? 0 : type.defaultGst, taxInclusive: false, discount: 0, advance: 0, issued: now.toISOString(), due: isoIn(g?.dueDays ?? type.dueDays, now), note: type.defaultNote, project: '', terms: type.defaultTerms?.length ? type.defaultTerms : biz?.defaultTerms ?? [], extra: { ...DEFAULT_EXTRA, layout: (biz?.defaultLayout as Draft['extra']['layout']) ?? 'classic', customTerms: biz?.defaultCustomTerms ?? '' } }
}

/* Changing the invoice type keeps what you already typed: client, lines, notes, terms, greeting and design. */
function withCarry(base: Draft, c: Draft | null, type: InvoiceType): Draft {
  if (!c) return base
  const fields = Object.fromEntries(type.fields.filter((f) => c.fields[f.id]).map((f) => [f.id, c.fields[f.id]]))
  return { ...base, linkId: c.linkId || base.linkId, theme: c.theme, items: c.items, fields: { ...base.fields, ...fields }, discount: type.discount ? c.discount : 0, advance: type.advance ? c.advance : 0, note: c.note || base.note, project: c.project, terms: c.terms.length ? c.terms : base.terms, extra: { ...base.extra, ...c.extra } }
}

function Form({ type, links, groups, existing, preClient, memory, reloadLinks }: { type: InvoiceType; links: ClientLink[]; groups: Group[]; existing: InvoiceView | null; preClient: string | null; memory: Memory[]; reloadLinks: () => void }) {
  const { me } = useSession()
  /* your catalogue first in line suggestions, then what you billed before */
  const catMem: Memory[] = (me?.business?.catalogue?.services ?? []).map((c) => ({ desc: c.name, rate: c.rate, qty: 1, uses: Number.MAX_SAFE_INTEGER }))
  const lineMemory = [...catMem, ...memory.filter((m) => !catMem.some((c) => c.desc.toLowerCase() === m.desc.toLowerCase()))]
  const nav = useNavigate()
  const toast = useToast()
  const key = draftKey(existing?.id, type.id ?? '')
  const carried = useMemo(() => (existing ? null : readCarry()), [existing])
  useEffect(() => { if (carried) clearCarry() }, [carried])
  const restored = useMemo(() => (carried ? null : readDraft(key)), [key, carried])
  const { d, set, undo, redo, clean, canUndo, canRedo, dirty } = useDraft(useMemo(() => restored?.d ?? withCarry(initial(type, links, groups, existing, preClient, me?.business), carried, type), [restored, carried, type, links, groups, existing, preClient, me?.business]), !!restored || !!carried)
  const [step, setStep] = useState(restored?.step ?? (existing ? 5 : 0))
  const [tried, setTried] = useState<Set<number>>(new Set())
  const [shk, setShk] = useState(0)
  const [dir, setDir] = useState(1)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [done, setDone] = useState<{ number: string; message: string; phone: string; id: string } | null>(null)
  const [services, setServices] = useState<string[]>(restored?.services ?? [])
  const [termsAuto, setTermsAuto] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [ack, setAck] = useState(false)
  const [ackOpen, setAckOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [delivery, setDelivery] = useState<SendOpts['delivery']>('shakeslip')
  const ackKey = `ss-ack-${d.linkId}-${d.project || 'general'}`
  const [editing, setEditing] = useState<ClientLink | null>(null)
  const [keepGreet, setKeepGreet] = useState('')
  const [invite, setInvite] = useState(false)
  const go = (n: number) => { setDir(n > step ? 1 : -1); setStep(n); document.querySelector('.ed2-panel')?.scrollTo({ top: 0, behavior: 'smooth' }) }

  const link = links.find((l) => l.id === d.linkId)
  const biz = me!.business!
  const from: Business = biz
  const gst = type.taxMode === 'none' ? 0 : d.gstPct
  /* a percentage discount follows the lines; it is saved as the rupee amount so the totals are exact */
  const subtotal = d.items.reduce((n, i) => n + Math.round(i.qty * i.rate), 0)
  const discount = type.discount ? (d.extra.discountPct ? Math.round((subtotal * d.extra.discountPct) / 100) : d.discount) : 0
  const t = liveTotals(d.items, gst, discount, type.advance ? d.advance : 0, d.taxInclusive)
  const billTo = link ? { name: link.name, company: link.company, gstin: link.gstin, city: link.city, address: link.address, email: link.email, phone: link.phone, state: link.state, honorific: link.honorific, attention: link.attention || link.name, area: link.area, pin: link.pin, pan: link.pan, logo: link.logo } : null
  const doc: DocData = { number: existing?.number ?? null, type, theme: d.theme, billTo, from, items: d.items, fields: d.fields, gstPct: gst, issued: d.issued, due: d.due, note: d.note, project: d.project, terms: d.terms, taxInclusive: d.taxInclusive, interState: isInterState(stateOf(from.gstin, from.state), stateOf(link?.gstin, link?.state)), totals: t, extra: d.extra }
  const ctx = docCtx(doc)
  /* while terms are in suggested mode, rebuild them when the plan, services or due date change */
  const termsKey = `${d.extra.plan.kind}|${services.join(',')}|${d.extra.category}|${d.advance > 0}|${ctx.dueDays > 0}`
  useEffect(() => {
    if (!termsAuto) return
    const next = [...new Set([...suggestClauses({ advance: d.advance, dueDays: ctx.dueDays, profession: biz.profession, plan: d.extra.plan.kind }), ...autoMatch(`${services.join(' ')} ${d.items.map((i) => i.desc).join(' ')}`, d.extra.category)])]
    if (next.join('|') !== d.terms.join('|')) set({ terms: next })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termsKey, termsAuto])
  /* the greeting is written from the client's title and name; when those change later, offer the new wording */
  const freshGreet = link ? salutationFor(link.honorific, link.attention || link.name) : ''
  const staleGreet = !!d.extra.salutation && !!freshGreet && /^(Dear|Respected)\b/.test(d.extra.salutation) && d.extra.salutation !== freshGreet && keepGreet !== freshGreet
  const checks = reviewChecks(d, type, link, from, t.total)
  /* What is missing on each step. Shown as a banner, red fields and red marks on the preview. */
  const missingTop = type.fields.filter((f) => f.place === 'top' && f.required && !d.fields[f.id]?.trim())
  const missingBottom = type.fields.filter((f) => f.place === 'bottom' && f.required && !d.fields[f.id]?.trim())
  const issues: Issue[][] = [
    [...(!link ? [{ text: 'Choose who this invoice is for.', focus: 'bill' as DocFocus }] : []), ...missingTop.map((f) => ({ text: `Fill in ${f.label}.`, focus: 'scope' as DocFocus }))],
    [],
    [...(t.total <= 0 ? [{ text: 'Add at least one line with an amount.', focus: 'items' as DocFocus }] : []),
      ...(d.items.some((i) => i.desc.trim() && Math.round(i.qty * i.rate) === 0) ? [{ text: 'A line has a description but no amount.', focus: 'items' as DocFocus }] : []),
      ...(d.items.some((i) => !i.desc.trim() && Math.round(i.qty * i.rate) > 0) ? [{ text: 'A line has an amount but no description.', focus: 'items' as DocFocus }] : [])],
    [...missingBottom.map((f) => ({ text: `Fill in ${f.label}.`, focus: 'totals' as DocFocus })), ...(d.extra.plan.kind === 'custom' && !d.extra.plan.text.trim() ? [{ text: 'Write your custom payment terms, or pick another plan.', focus: 'totals' as DocFocus }] : [])],
    [], [],
  ]
  const shown = (s: number) => tried.has(s) ? issues[s] : []
  const docErrors = [...new Set([...tried].flatMap((s) => issues[s].map((x) => x.focus)))]
  function tryGo(n: number) {
    const bad = issues[step]
    if (n > step && bad.length) { setTried((x) => new Set(x).add(step)); setShk((k) => k + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    go(n)
  }
  /* phone: swipe left for the next step, right for the previous one; never switches tabs from here */
  useSwipeClaim({
    left: () => { if (tab !== 'edit' || step >= STEPS.length - 1) return 'block'; tryGo(step + 1); return true },
    right: () => { if (tab !== 'edit' || step <= 0) return 'block'; tryGo(step - 1); return true },
  })
  function trySend() {
    const first = issues.findIndex((x) => x.length)
    if (first >= 0) { setTried(new Set(issues.map((x, i) => (x.length ? i : -1)).filter((i) => i >= 0))); setShk((k) => k + 1); go(first); return }
    /* suggested terms: ask once per client and project to confirm they were reviewed */
    let acked = false
    try { acked = localStorage.getItem(ackKey) === '1' } catch { /* storage may be off */ }
    if (generated && (d.terms.length || d.extra.annexure) && !acked && !d.extra.termsAckAt) { setAck(false); setAckOpen(true); return }
    setSendOpen(true)
  }

  const body = (patch: Partial<Draft['extra']> = {}) => ({ linkId: d.linkId, typeId: type.id, theme: d.theme, items: d.items, fields: d.fields, gstPct: gst, discount, advance: type.advance ? d.advance : 0, issued: d.issued, due: d.due, note: d.note, project: d.project, terms: d.terms, taxInclusive: d.taxInclusive, extra: { ...d.extra, ...patch } })
  const [draftId, setDraftId] = useState<string | null>(restored?.draftId ?? existing?.id ?? null)
  const [leaving, setLeaving] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  async function save(patch: Partial<Draft['extra']> = {}): Promise<string> {
    if (draftId) { await put(`/studio/invoices/${draftId}`, body(patch)); return draftId }
    const id = (await post<{ id: string }>('/studio/invoices', body(patch))).id
    setDraftId(id)
    return id
  }
  /* keep unsent work in this browser as you type; gone once it is saved or sent */
  useEffect(() => {
    if (!dirty) { clearDraft(key); return }
    const id = setTimeout(() => writeDraft(key, { d, step, services, draftId, at: Date.now(), typeId: type.id ?? '', client: link?.company || link?.name || '' }), 400)
    return () => clearTimeout(id)
  }, [d, step, services, draftId, dirty, key, type.id, link])
  /* autosave a draft every 20 seconds once there is a client and an amount, so nothing is lost */
  useEffect(() => {
    if (!dirty || !link || t.total <= 0) return
    const id = setTimeout(() => { save().then(() => { clean(); setSavedAt(Date.now()) }).catch(() => {}) }, 20_000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, dirty])
  /* buttons and the search palette ask before navigating; the browser's back button gets one extra step so we can ask too */
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  useEffect(() => { setNavGuard((to) => { if (!dirtyRef.current) return false; setLeaving(to); return true }); return () => setNavGuard(null) }, [])
  useEffect(() => {
    if (!dirty) return
    if (!(history.state as { ssGuard?: boolean } | null)?.ssGuard) history.pushState({ ...history.state, ssGuard: true }, '')
    const onPop = (e: PopStateEvent) => {
      if ((e.state as { ssGuard?: boolean } | null)?.ssGuard || !dirtyRef.current) return
      history.pushState({ ...history.state, ssGuard: true }, ''); setLeaving(BACK)
    }
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [dirty])
  const leaveTo = (to: string) => (to === BACK ? history.go(-2) : nav(to))
  /* leaving with unsaved changes: our own prompt for links inside the app (the browser handles closing the tab) */
  useEffect(() => {
    if (!dirty) return
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
      if (!a || a.hasAttribute('data-carry') || a.target === '_blank' || e.metaKey || e.ctrlKey) return
      const url = new URL(a.href)
      if (url.origin !== location.origin || url.pathname === location.pathname) return
      e.preventDefault(); e.stopPropagation(); setLeaving(url.pathname + url.search)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [dirty])

  async function act(kind: 'draft' | 'send', patch: Partial<Draft['extra']> = {}, opts?: SendOpts) {
    if (busy) return
    setBusy(true)
    try {
      const invId = await save(patch)
      clean()
      if (kind === 'draft') { toast.ok('Draft saved.'); nav('/studio/invoices'); return }
      const r = await post<{ number: string; message: string; phone: string }>(`/studio/invoices/${invId}/send`, opts ?? {})
      setDelivery(opts?.delivery ?? 'shakeslip'); setSendOpen(false)
      setDone({ ...r, id: invId })
    } catch (e) { toast.bad(errText(e)) } finally { setBusy(false) }
  }

  const panel = [
    <ClientStep key="c" d={d} set={set} type={type} links={links} groups={groups} onEditClient={setEditing} onAdd={() => setInvite(true)} showErrors={tried.has(0)} />,
    <ScopeStep key="s" d={d} set={set} type={type} memory={memory} profession={biz.profession} services={services} setServices={setServices} />,
    <AmountsStep key="a" d={d} set={set} type={type} link={link} from={from} t={t} memory={lineMemory} showErrors={tried.has(2)} />,
    <PaymentStep key="p" d={d} set={set} type={type} from={from} total={t.total} group={groups.find((g) => g.id === link?.groupId)} />,
    <TermsStep key="t" d={d} set={set} ctx={ctx} profession={biz.profession} services={services} auto={termsAuto} setAuto={(v) => { setTermsAuto(v); if (v) setGenerated(true) }} markGenerated={() => setGenerated(true)} />,
    <ReviewStep key="r" d={d} set={set} checks={checks} />,
  ][step]

  return (
    <div className="ed2">
      <header className="ed2-head">
        <div className="trunc"><h1 className="trunc">{existing ? 'Edit draft' : `New ${type.title.toLowerCase()}`}</h1><p className="trunc">{type.name} · {link?.company || link?.name || 'No client yet'}</p></div>
        <div className="ed2-tools">
          <IconButton label="Undo (Cmd Z)" disabled={!canUndo} onClick={undo}><Undo2 size={18} /></IconButton>
          <IconButton label="Redo (Shift Cmd Z)" disabled={!canRedo} onClick={redo}><Redo2 size={18} /></IconButton>
          {savedAt && !dirty && <span className="saved-note">Saved</span>}
          {!existing && <Link to={`/studio/new?pick=1${d.linkId ? `&client=${d.linkId}` : ''}`} className="au-link" data-carry onClick={() => { writeCarry(d); clearDraft(key) }}>Change type</Link>}
        </div>
      </header>

      <nav className="ed2-steps" aria-label="Steps">
        <motion.span className="ed2-progress" animate={{ scaleX: (step + 1) / STEPS.length }} transition={springSoft} style={{ originX: 0 }} aria-hidden />
        {STEPS.map((s, i) => (
          <button key={s} className="ed2-step tap" aria-current={i === step ? 'step' : undefined} onClick={() => go(i)}>
            {i === step && <motion.span layoutId="ed2-step-pill" className="ed2-step-pill" transition={spring} />}
            <span className="ed2-step-n num">{i + 1}</span><span className="ed2-step-l">{s}</span>
          </button>
        ))}
      </nav>

      <div className="seg ed2-seg" role="tablist" aria-label="View">
        {(['edit', 'preview'] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} className="seg-b tap" onClick={() => setTab(k)}>{k === 'edit' ? 'Edit' : 'Preview'}</button>)}
      </div>

      <div className="ed2-body" data-tab={tab}>
        <div className={`ed2-panel ${shk % 2 ? 'shk-a' : 'shk-b'}`}>
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div key={step} custom={dir} variants={{ in: (k: number) => ({ opacity: 0, x: 16 * k }), on: { opacity: 1, x: 0 }, out: (k: number) => ({ opacity: 0, x: -10 * k, transition: { duration: 0.12 } }) }} initial="in" animate="on" exit="out" transition={{ type: 'spring', stiffness: 420, damping: 38 }}>
              {staleGreet && <Banner tone="warn" title="Client details changed">The greeting says "{d.extra.salutation}", but their details now give "{freshGreet}". <button type="button" className="au-link" onClick={() => set({ extra: { ...d.extra, salutation: freshGreet } })}>Update to latest</button> <button type="button" className="au-link" onClick={() => setKeepGreet(freshGreet)}>Keep mine</button></Banner>}
              {restored && dirty && !savedAt && <Banner tone="info" title="Picked up where you left off">We restored your unsaved invoice from {new Date(restored.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}. <button type="button" className="au-link" onClick={() => { clearDraft(key); location.reload() }}>Start fresh instead</button></Banner>}
              {shown(step).length > 0 && <Banner tone="error" shake={shk} title={shown(step).length === 1 ? shown(step)[0].text : 'A few things need your attention'}>{shown(step).length > 1 && <ul>{shown(step).map((x) => <li key={x.text}>{x.text}</li>)}</ul>}</Banner>}
              {panel}
            </motion.div>
          </AnimatePresence>
          <div className="ed2-foot">
            {step > 0 ? <Button onClick={() => tryGo(step - 1)}><ArrowLeft size={18} aria-hidden />Back</Button> : <span />}
            {step < STEPS.length - 1
              ? <><span className="ed2-total num" aria-live="polite"><small>Total</small>{money(t.total)}</span><Button variant="primary" className="next-btn" onClick={() => tryGo(step + 1)}>
                  <span className="next-l"><AnimatePresence mode="popLayout" initial={false}><motion.span key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ type: 'spring', stiffness: 520, damping: 38 }}>Next: {STEPS[step + 1]}</motion.span></AnimatePresence></span>
                  <ArrowRight size={18} aria-hidden className="next-a" />
                </Button></>
              : <div className="ed2-send">
                  <Button disabled={busy || !link} onClick={() => act('draft')}><Save size={18} aria-hidden />Save draft</Button>
                  <Button variant="primary" disabled={busy} onClick={trySend}><Send size={18} aria-hidden />{busy ? 'Sending' : `Send ${money(Math.max(t.total - t.advance, 0), d.extra.currency)}`}</Button>
                </div>}
          </div>
        </div>
        <div className="ed2-doc"><DocViewer d={doc} focus={FOCUS[step]} errors={docErrors} page={step === 4 && d.extra.showTerms !== false && d.terms.length + d.extra.customTerms.length > 0 ? 1 : step < 4 ? 0 : undefined} /></div>
      </div>

      <Dialog open={ackOpen} onClose={() => setAckOpen(false)} title="Review the suggested terms">
        <p style={{ color: 'var(--text-2)' }}>Some terms or the annexure on this invoice were suggested automatically. They are general starting points, not legal advice, and may not fit this job.</p>
        <label className="check"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /><span>I have read the terms on this invoice. I am responsible for them, and Shakeslip is not.</span></label>
        <div className="dlg-form">
          <Button variant="primary" block disabled={!ack || busy} onClick={() => { try { localStorage.setItem(ackKey, '1') } catch { /* storage may be off */ } setAckOpen(false); setSendOpen(true) }}>Continue</Button>
          <Button block variant="ghost" onClick={() => { setAckOpen(false); go(4) }}>Review the terms first</Button>
        </div>
      </Dialog>

      <SendDialog open={sendOpen} onClose={() => setSendOpen(false)} busy={busy} client={link} label={money(Math.max(t.total - t.advance, 0), d.extra.currency)} onSend={(o) => void act('send', ack ? { termsAckAt: new Date().toISOString() } : {}, o)} />

      <Dialog open={!!leaving} onClose={() => setLeaving(null)} title="Leave this invoice?">
        <p style={{ color: 'var(--text-2)' }}>You have changes that are not saved yet.</p>
        <div className="dlg-form">
          <Button variant="primary" block disabled={busy || !link} onClick={async () => { const to = leaving!; try { await save(); clean(); toast.ok('Saved as a draft.') } catch (e) { toast.bad(errText(e)); return } setLeaving(null); setTimeout(() => leaveTo(to), 0) }}><Save size={18} aria-hidden />Save as draft and leave</Button>
          <Button block onClick={() => { const to = leaving!; clean(); setLeaving(null); setTimeout(() => leaveTo(to), 0) }}>Discard changes</Button>
          <Button block variant="ghost" onClick={() => setLeaving(null)}>Stay here</Button>
        </div>
      </Dialog>

      <InviteDialog open={invite} onClose={() => setInvite(false)} groups={groups} onDone={(id) => { reloadLinks(); if (id) set({ linkId: id }) }} />
      <ClientDialog link={editing} onClose={() => setEditing(null)} onSaved={reloadLinks} />

      <Dialog open={!!done} onClose={() => nav(`/studio/invoices/${done?.id}`)} title="">
        <div className="sent-ok">
          <svg viewBox="0 0 64 64" className="sent-check" aria-hidden>
            <motion.circle cx="32" cy="32" r="28" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} />
            <motion.path d="M20 33l8 8 16-17" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />
          </svg>
          <h2>Sent</h2>
          {delivery === 'pdf'
            ? <p>{done?.number} is issued and locked. Nothing was sent to {link?.company || link?.name}. Download the PDF and send it yourself.</p>
            : <p>{done?.number} is on its way to {link?.company || link?.name}. {link?.email ? 'They were emailed a copy and it is in their Slip inbox.' : 'It is waiting in their Slip inbox.'} You will hear when they open it and when they pay.</p>}
        </div>
        {delivery === 'pdf' && <Button variant="primary" block onClick={async () => { try { await downloadPdf(`/studio/invoices/${done!.id}/pdf`, `${done!.number}.pdf`); toast.ok('PDF downloaded.') } catch (e) { toast.bad(errText(e)) } }}><FileDown size={18} aria-hidden />Download PDF</Button>}
        {link?.phone && <Button block onClick={() => { void post(`/studio/invoices/${done!.id}/whatsapp-sent`); window.open(whatsappUrl(done!.phone, done!.message), '_blank', 'noopener') }}><MessageCircle size={18} aria-hidden />Also share on WhatsApp</Button>}
        <Button variant={delivery === 'pdf' ? 'secondary' : 'primary'} block onClick={() => nav(`/studio/invoices/${done?.id}`)}>View invoice</Button>
      </Dialog>
    </div>
  )
}
