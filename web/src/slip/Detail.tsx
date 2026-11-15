import { ArrowLeft, CheckCheck, Download, HandCoins, MessageSquareWarning, PenLine, Smartphone, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, IconButton } from '../components/Button'
import { Chip } from '../components/Chip'
import { Dialog } from '../components/Dialog'
import { Feed } from '../components/Feed'
import { Field, TextArea } from '../components/Field'
import { SignaturePad } from '../components/SignaturePad'
import { DocViewer } from '../components/DocViewer'
import { StatusBadge } from '../components/Status'
import { errText, post } from '../lib/api'
import { money, rupees, toPaise } from '../lib/money'
import { docOf } from '../lib/preview'
import { useSession } from '../lib/session'
import { useToast } from '../lib/toast'
import type { InvoiceView, Mark } from '../lib/types'
import { useApi } from '../lib/useApi'
import { downloadPdf } from '../lib/download'
import { upiLink } from '../lib/upi'
import '../components/page.css'
import '../studio/detail.css'

const METHODS = [['upi', 'UPI'], ['card', 'Card'], ['cash', 'Cash'], ['bank', 'Bank transfer'], ['other', 'Something else']] as const

export default function Detail() {
  const { id } = useParams()
  const { data: inv, error, reload } = useApi<InvoiceView>(`/slip/invoices/${id}`)
  const [dlg, setDlg] = useState<'paid' | 'accept' | null>(null)
  const [noting, setNoting] = useState(false)
  const [marks, setMarks] = useState<Mark[]>([])
  const [note, setNote] = useState('')
  const { me } = useSession()
  const [sig, setSig] = useState('')
  const [method, setMethod] = useState('upi')
  const [signer, setSigner] = useState(me?.user?.name ?? '')
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const [pdfBusy, setPdfBusy] = useState(false)
  if (error && !inv) return <div className="empty"><h3>Invoice not found</h3><p>{error}</p><Link to="/slip"><Button>Back to inbox</Button></Link></div>
  if (!inv) return <div aria-busy="true" style={{ minHeight: 400 }} />
  const m = (n: number) => money(n, inv.extra?.currency ?? 'INR')
  const claimed = inv.payments.find((p) => p.status === 'claimed')
  const confirmed = inv.events.some((e) => e.kind === 'details')

  async function run(fn: () => Promise<unknown>, ok: string) {
    if (busy) return
    setBusy(true)
    try { await fn(); toast.ok(ok); setDlg(null); await reload() } catch (e) { toast.bad(errText(e)) } finally { setBusy(false) }
  }

  return (
    <>
      <Link to="/slip" className="back tap"><ArrowLeft size={16} aria-hidden />Inbox</Link>
      <div className="ph"><div><h1 className="num">{inv.number}</h1><p>From {inv.from.name}</p></div><StatusBadge status={inv.status} /></div>
      <div className="split">
        <div className="split-main"><DocViewer d={docOf(inv)} pins={noting ? marks : inv.annotations} onMark={noting ? (m) => setMarks((l) => (l.length >= 20 ? l : [...l, { ...m, text: '' }])) : undefined} /></div>
        <aside className="split-side">
          {noting && (
            <div className="notes">
              <h2 className="side-h">Ask for a change</h2>
              <p className="hint">Tap the invoice where something is wrong. Each tap drops a numbered mark you can describe.</p>
              {marks.map((m, i) => (
                <div key={i} className="note-i"><b>{i + 1}</b><textarea className="input" rows={2} maxLength={200} value={m.text} aria-label={`Mark ${i + 1}`} placeholder="What is wrong here?" onChange={(e) => setMarks((l) => l.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} /><IconButton label={`Remove mark ${i + 1}`} onClick={() => setMarks((l) => l.filter((_, j) => j !== i))}><X size={16} /></IconButton></div>
              ))}
              <TextArea label="Anything else? (optional)" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
              <Button variant="primary" block disabled={busy || (!note.trim() && !marks.length) || marks.some((m) => !m.text.trim())} onClick={() => run(() => post(`/slip/invoices/${inv.id}/request-change`, { message: note.trim(), pins: marks.map((m) => ({ ...m, text: m.text.trim() })) }), 'Request sent.').then(() => { setNoting(false); setMarks([]); setNote('') })}>Send request</Button>
              <Button block variant="ghost" onClick={() => { setNoting(false); setMarks([]); setNote('') }}>Cancel</Button>
            </div>
          )}
          {inv.acceptance?.required && (
            inv.acceptance.at
              ? <p className="claim ok-card"><b>Accepted</b>You accepted this invoice as {inv.acceptance.name}. {inv.from.name} was told.</p>
              : inv.status !== 'void' && <div className="claim"><b>{inv.from.name} asks you to accept this invoice</b><span>Review it, then sign. You and {inv.from.name} both get a notification.</span><Button variant="primary" block onClick={() => setDlg('accept')}><PenLine size={18} aria-hidden />Accept and sign</Button></div>
          )}
          <div className="balance"><small>{inv.status === 'paid' ? 'Settled' : 'Amount to pay'}</small><b className="num">{m(inv.totals.balance)}</b></div>
          {claimed && <p className="claim">You told {inv.from.name} you paid {m(claimed.amount)}. They will confirm once it reaches them.</p>}
          <div className="stack">
            {inv.from.upiId && inv.totals.balance > 0 && (inv.extra?.currency ?? 'INR') === 'INR' && inv.status !== 'void' && <a className="btn btn-primary btn-block" href={upiLink(inv.from.upiId, inv.from.name, inv.totals.balance, inv.number ?? 'Invoice')}><Smartphone size={18} aria-hidden />Pay {m(inv.totals.balance)} with UPI</a>}
            <Button variant={inv.from.upiId ? 'secondary' : 'primary'} block disabled={inv.status === 'paid' || inv.status === 'void' || !!claimed} onClick={() => setDlg('paid')}><HandCoins size={18} aria-hidden />Payment done</Button>
            <Button block disabled={confirmed || busy} onClick={() => run(() => post(`/slip/invoices/${inv.id}/confirm-details`), `${inv.from.name} knows your details are correct.`)}><CheckCheck size={18} aria-hidden />{confirmed ? 'Details confirmed' : 'My details are correct'}</Button>
            <Button block onClick={() => setNoting(true)}><MessageSquareWarning size={18} aria-hidden />Ask for a change</Button>
            <Button block variant="ghost" disabled={pdfBusy} onClick={async () => { setPdfBusy(true); try { await downloadPdf(`/slip/invoices/${inv.id}/pdf`, `${inv.number ?? 'invoice'}.pdf`); toast.ok('PDF downloaded.') } catch (e) { toast.bad((e as Error).message) } finally { setPdfBusy(false) } }}><Download size={18} aria-hidden />{pdfBusy ? 'Making your PDF' : 'Download PDF'}</Button>
          </div>
          <p className="hint">{inv.from.upiId ? 'The UPI button opens GPay, PhonePe or any UPI app on your phone with the amount filled in. ' : ''}Shakeslip never handles the money. After paying, tap "Payment done" so {inv.from.name} can match it.</p>
          <h2 className="side-h">Activity</h2>
          <Feed events={inv.events} />
        </aside>
      </div>

      <Dialog open={dlg === 'paid'} onClose={() => setDlg(null)} title="Payment done">
        <p style={{ color: 'var(--text-2)' }}>{inv.from.name} gets a notification and confirms once the money reaches them.</p>
        <form className="dlg-form" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run(() => post(`/slip/invoices/${inv.id}/claim`, { method, amount: toPaise(String(f.get('amount'))), ref: String(f.get('ref') ?? '') }), 'Sent. They will confirm shortly.') }}>
          <div className="field"><span>How did you pay?</span><div className="chips2">{METHODS.map(([k, l]) => <Chip key={k} icon={false} on={method === k} onClick={() => setMethod(k)}>{l}</Chip>)}</div></div>
          <Field label="Amount paid (INR)" name="amount" inputMode="decimal" defaultValue={rupees(inv.totals.balance)} required />
          <Field label="Reference, if any (optional)" name="ref" placeholder="Helps them match your payment" />
          <Button variant="primary" type="submit" block disabled={busy}>Tell {inv.from.name}</Button>
        </form>
      </Dialog>
      <Dialog open={dlg === 'accept'} onClose={() => setDlg(null)} title="Accept and sign">
        <p style={{ color: 'var(--text-2)' }}>By signing you confirm you have read {inv.number} from {inv.from.name} and accept it, including its terms.</p>
        <Field label="Your full name" value={signer} maxLength={80} onChange={(e) => setSigner(e.target.value)} />
        {sig
          ? <div className="sig-done"><img src={sig} alt="Your signature" /><Button variant="ghost" onClick={() => setSig('')}>Draw again</Button></div>
          : <><p className="hint">Draw your signature, or skip it and your typed name is used.</p>{dlg === 'accept' && <SignaturePad onSave={setSig} />}</>}
        <Button variant="primary" block disabled={busy || signer.trim().length < 2} onClick={() => run(() => post(`/slip/invoices/${inv.id}/accept`, { name: signer.trim(), ...(sig ? { signature: sig } : {}) }), `Accepted. ${inv.from.name} has been told.`)}><PenLine size={18} aria-hidden />Accept and sign</Button>
      </Dialog>
    </>
  )
}
