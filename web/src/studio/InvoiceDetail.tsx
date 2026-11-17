import { ConfirmAction } from '../components/ConfirmAction'
import { WhatsAppIcon } from '../components/WhatsAppIcon'
import { ArrowLeft, ArrowRightLeft, Ban, Banknote, Check, Copy, Download, Pencil, Receipt, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, IconButton } from '../components/Button'
import { Feed } from '../components/Feed'
import { DocViewer } from '../components/DocViewer'
import { StatusBadge } from '../components/Status'
import { errText, post, put } from '../lib/api'
import { money } from '../lib/money'
import { docOf } from '../lib/preview'
import { useToast } from '../lib/toast'
import type { InvoiceView, Payment } from '../lib/types'
import { useApi } from '../lib/useApi'
import { PaymentDialog, RemovePaymentDialog } from './PaymentDialog'
import { downloadPdf } from '../lib/download'
import { whatsappUrl } from '../lib/whatsapp'
import { fmtDate } from '../lib/dates'
import '../components/page.css'
import './detail.css'

const KIND_NAME: Record<string, string> = { payment: 'Payment', advance: 'Advance', tds: 'TDS', writeoff: 'Write-off', refund: 'Refund' }

export default function InvoiceDetail() {
  const { id } = useParams()
  const { data: inv, error, reload } = useApi<InvoiceView>(`/studio/invoices/${id}`)
  const [voidOpen, setVoidOpen] = useState(false)
  const [pay, setPay] = useState(false)
  const [busy, setBusy] = useState('')
  const toast = useToast()
  const [pdfBusy, setPdfBusy] = useState(false)
  const [editPay, setEditPay] = useState<Payment | null>(null)
  const [removePay, setRemovePay] = useState<Payment | null>(null)
  const nav = useNavigate()
  const fee = useApi<{ amount: number }>(inv && ['overdue', 'partial', 'sent', 'viewed'].includes(inv.status) ? `/studio/automation/late-fee/${id}` : null).data?.amount ?? 0
  if (error && !inv) return <div className="empty"><h3>Invoice not found</h3><p>{error}</p><Link to="/studio/invoices"><Button>Back to invoices</Button></Link></div>
  if (!inv) return <div aria-busy="true" style={{ minHeight: 400 }} />
  const m = (n: number) => money(n, inv.extra?.currency ?? 'INR')
  const t = inv.totals
  const claimed = inv.payments.filter((p) => p.status === 'claimed')

  async function run(key: string, fn: () => Promise<unknown>, okText: string) {
    if (busy) return
    setBusy(key)
    try { await fn(); toast.ok(okText); await reload() } catch (e) { toast.bad(errText(e)) } finally { setBusy('') }
  }
  const wa = () => {
    const msg = `Hi ${inv.billTo.name}, ${inv.type.title.toLowerCase()} ${inv.number} from ${inv.from.name} for ${m(t.balance)} is due ${fmtDate(inv.due)}. You can view it on Shakeslip.`
    void post(`/studio/invoices/${inv.id}/whatsapp-sent`).then(reload)
    window.open(whatsappUrl(inv.billTo.phone, msg), '_blank', 'noopener')
  }
  const quote = inv.type.prefix === 'QTN' || /quot|estimate|proposal/i.test(inv.type.title)
  async function copy(query: string, okText: string) {
    if (busy) return
    setBusy('copy')
    try { const r = await post<{ id: string }>(`/studio/invoices/${inv!.id}/duplicate${query}`); toast.ok(okText); nav(`/studio/invoices/${r.id}/edit`) } catch (e) { toast.bad(errText(e)) } finally { setBusy('') }
  }

  return (
    <>
      <ConfirmAction open={voidOpen} onClose={() => setVoidOpen(false)} title="Void this invoice?" description="This cancels the invoice and notifies your client. To change it later, create a new invoice." action="Void invoice" reason onConfirm={async (reason) => { await post(`/studio/invoices/${inv.id}/void`, { message: reason }); await reload() }} />
      <Link to="/studio/invoices" className="back tap"><ArrowLeft size={16} aria-hidden />Invoices</Link>
      <div className="ph">
        <div><h1 className="num">{inv.number}</h1><p>{inv.billTo.company || inv.billTo.name} · {inv.type.title}</p></div>
        <StatusBadge status={inv.status} />
      </div>
      <div className="split">
        <div className="split-main"><DocViewer d={docOf(inv)} pins={inv.annotations} /></div>
        <aside className="split-side">
          <div className="balance"><small>Balance due</small><b className="num">{m(t.balance)}</b></div>
          {!!inv.annotations?.length && <div className="claim mark-list"><b>Changes asked for</b>{inv.annotations.map((m, i) => <p key={m.id ?? i}><b>{i + 1}</b><span>{m.text}</span></p>)}<small className="hint">The numbers match the marks on the invoice. Void it and send a new one to change it.</small></div>}
          {inv.acceptance?.required && <p className={`claim ${inv.acceptance.at ? 'ok-card' : ''}`}>{inv.acceptance.at ? <><b>Accepted</b><span>{inv.acceptance.name} signed this invoice. The signature is on the document.</span></> : <><b>Waiting for acceptance</b><span>{inv.billTo.name} was asked to accept and sign it in Slip. You will be notified.</span></>}</p>}
          {inv.delivery === 'pdf' && <p className="claim"><b>Shared as a PDF</b><span>You chose to send this yourself, so it is not in your client's Slip inbox. Download the PDF below.</span></p>}
          {claimed.map((p) => (
            <div key={p.id} className="claim">
              <p><b>{inv.billTo.name}</b> says they paid {m(p.amount)}{({ upi: ' by UPI', card: ' by card', cash: ' in cash', bank: ' by bank transfer', cheque: ' by cheque' } as Record<string, string>)[p.method] ?? ''}{p.ref ? `, ref ${p.ref}` : ''}.</p>
              <Button variant="primary" block disabled={!!busy} onClick={() => run(p.id, () => post(`/studio/invoices/payments/${p.id}/confirm`), 'Payment confirmed. Your client has a receipt.')}><Check size={18} aria-hidden />It reached me</Button>
            </div>
          ))}
          {fee > 0 && (
            <div className="claim">
              <p>A late fee of <b className="num">{m(fee)}</b> applies under your automation settings. This invoice stays as sent; the fee goes on a new invoice.</p>
              <Button block disabled={!!busy} onClick={async () => { if (busy) return; setBusy('fee'); try { const r = await post<{ id: string }>(`/studio/automation/late-fee/${inv.id}`); toast.ok('Late fee drafted. Check it and send.'); nav(`/studio/invoices/${r.id}/edit`) } catch (e) { toast.bad(errText(e)) } finally { setBusy('') } }}><Receipt size={18} aria-hidden />Bill late fee</Button>
            </div>
          )}
          <div className="stack">
            {quote
              ? <Button variant="primary" block disabled={inv.status === 'void' || !!busy} onClick={() => copy('?as=invoice', 'Invoice drafted from this quotation. Check it and send.')}><ArrowRightLeft size={18} aria-hidden />Turn into invoice</Button>
              : <Button variant="primary" block disabled={inv.status === 'void'} onClick={() => setPay(true)}><Banknote size={18} aria-hidden />Record payment or refund</Button>}
            <Button block disabled={!!busy || inv.status === 'paid' || inv.status === 'void'} onClick={() => run('remind', () => post(`/studio/invoices/${inv.id}/remind`), 'Reminder sent by email and in their inbox.')}><Send size={18} aria-hidden />Send reminder</Button>
            <Button block onClick={wa}><WhatsAppIcon size={18} aria-hidden />Share on WhatsApp</Button>
            {!['paid', 'void'].includes(inv.status) && <Button variant="danger" onClick={() => setVoidOpen(true)}><Ban size={18} aria-hidden />Void invoice</Button>}
            <Button block onClick={() => copy('', 'Copied into a new draft.')}><Copy size={18} aria-hidden />Duplicate</Button>
            <Button block variant="ghost" disabled={pdfBusy} onClick={async () => { setPdfBusy(true); try { await downloadPdf(`/studio/invoices/${inv.id}/pdf`, `${inv.number ?? 'invoice'}.pdf`); toast.ok('PDF downloaded.') } catch (e) { toast.bad((e as Error).message) } finally { setPdfBusy(false) } }}><Download size={18} aria-hidden />{pdfBusy ? 'Making your PDF' : 'Download PDF'}</Button>
          </div>
          {inv.payments.some((p) => p.status !== 'claimed') && (<>
            <h2 className="side-h">Money in and out</h2>
            <ul className="paylist">{inv.payments.filter((p) => p.status === 'confirmed').map((p) => (
              <li key={p.id}><span><b>{KIND_NAME[p.kind ?? 'payment']}</b><small>{fmtDate(p.paidAt)}{p.ref ? ` · ${p.ref}` : ''}{p.note ? ` · ${p.note}` : ''}{p.editedAt ? ' · edited' : ''}</small></span>
                <span className="pay-r"><b className={`num ${p.kind === 'refund' ? 'neg' : ''}`}>{p.kind === 'refund' ? '+' : '-'}{m(p.amount)}</b>
                  {inv.status !== 'void' && <span className="pay-acts"><IconButton label="Edit this payment" onClick={() => setEditPay(p)}><Pencil size={16} /></IconButton><IconButton className="danger-text" label="Remove this payment" onClick={() => setRemovePay(p)}><Trash2 size={16} /></IconButton></span>}</span></li>
            ))}</ul>
            {inv.payments.some((p) => p.status === 'voided') && <>
              <h3 className="side-h pay-gone-h">Removed</h3>
              <ul className="paylist pay-gone">{inv.payments.filter((p) => p.status === 'voided').map((p) => (
                <li key={p.id}><span><b>{KIND_NAME[p.kind ?? 'payment']}</b><small>{fmtDate(p.paidAt)} · removed {p.voidedAt ? fmtDate(p.voidedAt) : ''}{p.voidReason ? ` · ${p.voidReason}` : ''}</small></span><b className="num">{m(p.amount)}</b></li>
              ))}</ul>
            </>}
          </>)}
          <h2 className="side-h">Activity</h2>
          <Feed events={inv.events} />
        </aside>
      </div>

      <PaymentDialog key={`edit-${editPay?.id ?? 'x'}`} open={!!editPay} editing={editPay} onClose={() => setEditPay(null)} balance={t.balance} paid={t.paid} busy={!!busy} onSave={(body) => void run('edit', async () => { await put(`/studio/invoices/payments/${editPay!.id}`, body); setEditPay(null) }, 'Payment corrected. The change is in the activity log.')} />
      <RemovePaymentDialog open={!!removePay} onClose={() => setRemovePay(null)} payment={removePay} busy={!!busy} onConfirm={(reason) => void run('remove', async () => { await post(`/studio/invoices/payments/${removePay!.id}/void`, { reason }); setRemovePay(null) }, 'Payment removed. It stays on the record.')} />
      <PaymentDialog key={String(pay)} open={pay} onClose={() => setPay(false)} balance={t.balance} paid={t.paid} busy={!!busy} onSave={(body) => void run('pay', async () => { await post(`/studio/invoices/${inv.id}/payments`, body); setPay(false) }, 'Recorded. Your client is told and gets a receipt.')} />
    </>
  )
}
