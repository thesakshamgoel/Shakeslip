import { ConnectShare } from '../components/ConnectShare'
import { askConfirm } from '../components/ConfirmHost'
import { motion } from 'motion/react'
import { Building2, ChevronRight, FileCog, Link2, PenLine, ShieldCheck, Tags, Wallet, Workflow, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { CopyButton } from '../components/CopyButton'
import { DeleteAccount } from '../components/DeleteAccount'
import { QR } from '../components/QR'
import { errText, post } from '../lib/api'
import { listItem, spring, springSoft } from '../lib/motion'
import { usePhone } from '../mobile/basics'
import { useSession } from '../lib/session'
import { useToast } from '../lib/toast'
import { LogoPicker } from './LogoPicker'
import { SignaturePicker } from './SignaturePicker'
import { BusinessSection } from './settings/BusinessSection'
import { AutomationSection } from './settings/AutomationSection'
import { CatalogueSection } from './settings/CatalogueSection'
import { DefaultsSection } from './settings/DefaultsSection'
import { PaySection } from './settings/PaySection'
import { saveBusiness } from './settings/save'
import { codeLeft } from '../lib/codeTime'
import '../components/page.css'
import './editor.css'
import './clients.css'
import './settings.css'

const SECTIONS: { id: string; label: string; note: string; icon: LucideIcon }[] = [
  { id: 'business', label: 'Business', note: 'Name, GSTIN, address', icon: Building2 },
  { id: 'services', label: 'Services and rates', note: 'What you charge, packages', icon: Tags },
  { id: 'paid', label: 'Getting paid', note: 'Bank, UPI, QR, numbers', icon: Wallet },
  { id: 'defaults', label: 'Invoice defaults', note: 'Design and terms', icon: FileCog },
  { id: 'automation', label: 'Automation', note: 'Reminders, late fee', icon: Workflow },
  { id: 'brand', label: 'Logo and signature', note: 'How invoices are signed', icon: PenLine },
  { id: 'connect', label: 'Connect link', note: 'How clients find you', icon: Link2 },
  { id: 'account', label: 'Account and privacy', note: 'Legal, delete account', icon: ShieldCheck },
]

/* Settings grouped by what you are trying to do. The open section is kept in the URL. */
export default function Settings() {
  const [q, setQ] = useSearchParams()
  const phone = usePhone()
  const raw = SECTIONS.some((x) => x.id === q.get('s')) ? q.get('s')! : ''
  const s = raw || 'business'
  const cur = SECTIONS.find((x) => x.id === s)!
  const body = (
    <motion.div key={s} className="set-body" initial={{ opacity: 0, x: phone ? 28 : 0, y: phone ? 0 : 10 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={springSoft}>
      {s === 'business' && <BusinessSection />}
      {s === 'services' && <CatalogueSection />}
      {s === 'paid' && <PaySection />}
      {s === 'defaults' && <DefaultsSection />}
      {s === 'automation' && <AutomationSection />}
      {s === 'brand' && <><section className="set-card"><LogoPicker /></section><section className="set-card"><SignaturePicker /></section></>}
      {s === 'connect' && <ConnectSection />}
      {s === 'account' && <AccountSection />}
    </motion.div>
  )
  /* phone: a list of sections, each opens as its own screen (the back arrow comes back to the list) */
  if (phone) return raw ? (
    <><div className="ph"><div><h1>{cur.label}</h1><p>{cur.note}</p></div></div>{body}</>
  ) : (
    <>
      <div className="ph"><div><h1>Settings</h1><p>Changes apply to new invoices. Sent ones stay as they were.</p></div></div>
      <ul className="set-list">
        {SECTIONS.map((x, i) => (
          <motion.li key={x.id} {...listItem(i)}>
            <button className="set-list-i tap" onClick={() => setQ({ s: x.id })}>
              <span className="set-list-ic"><x.icon size={20} aria-hidden /></span><span><b>{x.label}</b><small>{x.note}</small></span><ChevronRight size={20} aria-hidden className="set-list-go" />
            </button>
          </motion.li>
        ))}
      </ul>
    </>
  )
  return (
    <>
      <div className="ph"><div><h1>Settings</h1><p>Everything that shapes your invoices. Changes apply to new invoices; sent ones stay as they were.</p></div></div>
      <div className="set2">
        <nav className="set-nav" aria-label="Settings sections">
          {SECTIONS.map((x) => (
            <button key={x.id} className="set-nav-i tap" aria-current={s === x.id ? 'page' : undefined} onClick={() => setQ({ s: x.id }, { replace: true })}>
              {s === x.id && <motion.span layoutId="set-nav-pill" className="set-nav-pill" transition={spring} />}
              <x.icon size={18} aria-hidden /><span><b>{x.label}</b><small>{x.note}</small></span>
            </button>
          ))}
        </nav>
        {body}
      </div>
    </>
  )
}

function ConnectSection() {
  const { me, refresh } = useSession()
  const b = me!.business!
  const toast = useToast()
  const [auto, setAuto] = useState(b.autoApprove)
  const url = `${location.origin}/c/${b.slug}`
  return (
    <section className="set-card">
      <header><h2>Connect link</h2><p>Share it on your website, card or invoices. Clients scan or open it, create a free Slip account and ask to connect.</p></header>
      <ConnectShare url={`${location.origin}/c/${me?.business?.slug}`} name={me?.business?.name ?? 'your studio'} />
      <div className="connect">
        <QR value={url} size={180} />
        <div className="dlg-form">
          <code className="code">{b.slug}</code>
          <small className="hint">{codeLeft(b.slugAt)}. Old codes stop working, so share the link rather than a screenshot.</small>
          <CopyButton text={url} />
          <Button variant="ghost" onClick={async () => { if (!(await askConfirm({ title: 'Make a new connect code?', description: 'The old link and QR code stop working straight away. Anyone you already shared them with will need the new one.', action: 'Make a new code' }))) return; try { await post('/studio/rotate-code'); await refresh(); toast.ok('New connect code created.') } catch (x) { toast.bad(errText(x)) } }}>Make a new code</Button>
        </div>
      </div>
      <label className="switch-row"><span><b>Connect people straight away</b><small>Off means you approve each request in Clients.</small></span><input type="checkbox" role="switch" checked={auto} onChange={async (e) => { const v = e.target.checked; setAuto(v); try { await saveBusiness(me!, { autoApprove: v }); await refresh(); toast.ok(v ? 'People connect straight away.' : 'You will approve each request.') } catch (x) { setAuto(!v); toast.bad(errText(x)) } }} /></label>
    </section>
  )
}

function AccountSection() {
  const [ambient, setAmbient] = useState(() => { try { return localStorage.getItem('ss-ambient') !== 'off' } catch { return true } })
  const { me } = useSession()
  return (
    <>
      <section className="set-card">
        <header><h2>Account</h2><p>Signed in as {me?.user?.email}.</p></header>
        <ul className="legal-links"><li><Link to="/faq">Questions and answers</Link></li><li><Link to="/terms">Terms of use</Link></li><li><Link to="/privacy">Privacy policy</Link></li><li><Link to="/cookies">Cookie policy</Link></li><li><Link to="/licence">Software licence</Link></li></ul>
      </section>
      <section className="set-card"><label className="switch-row"><span><b>Ambient motion</b><small>The slowly turning logo rings on the welcome, sign-in and empty screens. Your device's reduce-motion setting always wins.</small></span><input type="checkbox" role="switch" checked={ambient} onChange={(e) => { const on = e.target.checked; setAmbient(on); try { localStorage.setItem('ss-ambient', on ? 'on' : 'off') } catch { /* storage may be off */ } document.documentElement.dataset.ambient = on ? 'on' : 'off' }} /></label></section>
      <section className="set-card"><DeleteAccount /></section>
    </>
  )
}
