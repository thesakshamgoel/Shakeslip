import type { CSSProperties, ReactNode } from 'react'
import { fillClause, type ClauseContext } from '../lib/clauses'
import { fmtDate } from '../lib/dates'
import { financialYear } from '../lib/fy'
import { stateName, stateOf, supplyLabel } from '../lib/gst'
import { money } from '../lib/money'
import { attentionLine, planRows, planSummary } from '../lib/scope'
import type { Acceptance, BillTo, Business, CustomField, Extra, InvoiceType, LineItem, Status, Totals } from '../lib/types'
import { upiLink } from '../lib/upi'
import { amountInWords } from '../lib/words'
import { getInvoiceTheme } from '../themes/invoice'
import { Blocks, numberHeadings, paginate, parseFormatted, termBlocks } from './docParts'
import { planInvoice, payFlags } from './docPlan'
import { QR } from './QR'
import './document.css'

export type DocFocus = '' | 'bill' | 'scope' | 'items' | 'totals' | 'bank' | 'terms' | 'sign'
export type DocData = {
  number: string | null; type: InvoiceType; theme: string; billTo: BillTo | null; from: Business; items: LineItem[]; fields: Record<string, string>
  gstPct: number; issued: string; due: string; note: string; project: string; terms: string[]; taxInclusive: boolean; interState: boolean
  status?: Status; extra?: Extra; voidReason?: string; acceptance?: Acceptance
  totals: Pick<Totals, 'subtotal' | 'discount' | 'taxable' | 'gst' | 'total' | 'advance'> & { paid?: number; balance?: number }
}
export const DEFAULT_EXTRA: Extra = { currency: 'INR', category: '', completionDate: '', banner: '', salutation: '', intro: '', plan: { kind: 'none', advancePct: 50, text: '' }, showBank: true, showQr: true, showMobile: false, showTerms: true, annexure: '', customTerms: '', qrMode: 'upi', phoneId: '', discountPct: 0, emailIds: null, phoneIds: null }

const showField = (f: CustomField, v?: string) => (f.kind === 'date' && v ? fmtDate(new Date(v).toISOString()) : v)
const SIG_FONT: Record<string, string> = { 'great-vibes': "'Great Vibes'", allura: "'Allura'", caveat: "'Caveat'", 'dancing-script': "'Dancing Script'", sacramento: "'Sacramento'", parisienne: "'Parisienne'" }
const LOGO = { s: 7, m: 10, l: 13, xl: 17 }
const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })

function Page({ children, n, of, label }: { children: ReactNode; n: number; of: number; label: string }) {
  return (
    <section className="dp" aria-label={`Page ${n} of ${of}: ${label}`}>
      <div className="dp-bar" aria-hidden><i /><i /></div>
      {children}
      <footer className="dp-foot"><img src={`${import.meta.env.BASE_URL}brand/shakeslip.svg`} alt="" className="dp-foot-logo" /><span>Shakeslip</span></footer>
    </section>
  )
}

export function docCtx(d: DocData): ClauseContext {
  const t = d.totals, cur = d.extra?.currency ?? 'INR'
  const bal = t.balance ?? Math.max(t.total - t.advance, 0)
  return { client: d.billTo?.company || d.billTo?.name || '', business: d.from.name, city: d.from.city, total: money(t.total, cur), advance: money(t.advance, cur), balance: money(bal, cur), half: money(Math.round(t.total / 2), cur), dueDate: fmtDate(d.due), dueDays: Math.max(0, Math.round((new Date(d.due).getTime() - new Date(d.issued).getTime()) / 864e5)), project: d.project,
    advancePct: d.extra?.plan.advancePct ?? 50, planAdvance: money(Math.round((t.total * (d.extra?.plan.advancePct ?? 50)) / 100), cur), planBalance: money(t.total - Math.round((t.total * (d.extra?.plan.advancePct ?? 50)) / 100), cur) }
}
export function docPages(d: DocData) {
  const x = d.extra ?? DEFAULT_EXTRA
  return { inv: planInvoice(d), terms: x.showTerms === false ? [] : paginate(termBlocks(d.terms, x.customTerms, docCtx(d)), 4600), annex: paginate(numberHeadings(parseFormatted(fillClause(x.annexure, docCtx(d)))), 4800) }
}
export function docPageCount(d: DocData) { const p = docPages(d); return p.inv.length + p.terms.length + p.annex.length }
export function docPageLabels(d: DocData) { const p = docPages(d); return [d.type.title, ...p.inv.slice(1).map((_, i) => (p.inv.length > 2 ? `${d.type.title} ${i + 2}` : `${d.type.title} 2`)), ...p.terms.map((_, i) => (p.terms.length > 1 ? `Terms ${i + 1}` : 'Terms')), ...p.annex.map((_, i) => (p.annex.length > 1 ? `Annexure ${i + 1}` : 'Annexure'))] }

export function InvoiceDocument({ d, only, focus = '', errors = [] }: { d: DocData; only?: number; focus?: DocFocus; errors?: DocFocus[] }) {
  const F = ({ on, children, className = '', k }: { on: boolean; children: ReactNode; className?: string; k?: DocFocus }) => <div className={`df ${on ? 'is-focus' : ''} ${k && errors.includes(k) ? 'is-error' : ''} ${className}`}>{children}</div>
  const theme = getInvoiceTheme(d.theme)
  const x = d.extra ?? DEFAULT_EXTRA
  const cur = x.currency
  const m = (n: number) => money(n, cur)
  const t = d.totals
  const qty = d.type.lineMode === 'qty_rate'
  const isVoid = d.status === 'void'
  const { isQuote, balance, qrMode, bankOn, qrOn } = payFlags(d)
  const half = Math.round(d.gstPct * 5) / 10
  const top = d.type.fields.filter((f) => f.place === 'top' && d.fields[f.id])
  const bottom = d.type.fields.filter((f) => f.place === 'bottom' && d.fields[f.id])
  const { inv, terms, annex } = docPages(d)
  const total = inv.length + terms.length + annex.length
  const supply = supplyLabel(stateOf(d.billTo?.gstin, d.billTo?.state)) || supplyLabel(stateOf(d.from.gstin, d.from.state))
  const plan = planRows(x.plan.kind, x.plan.advancePct, t.total, x.plan.text)
  const sig = d.from.signature
  const STAMPS: Record<string, string> = { paid: 'Paid', overdue: 'Overdue', partial: 'Part paid', void: 'Void' }
  const stamp = STAMPS[d.status ?? ''] ?? ''
  const phones = d.from.phones ?? []
  const payPhone = (phones.find((p) => p.id === x.phoneId) ?? phones.find((p) => p.isDefault))?.number || d.from.phone
  const b = d.billTo
  /* the header shows the emails and numbers chosen for this invoice (nothing chosen means none); untouched means the defaults */
  const allE = d.from.emails?.length ? d.from.emails : d.from.email ? [{ id: 'main', address: d.from.email, isDefault: true }] : []
  const allP = d.from.phones?.length ? d.from.phones.map((p) => ({ id: p.id, address: p.number, isDefault: p.isDefault })) : d.from.phone ? [{ id: 'main', address: d.from.phone, isDefault: true }] : []
  const chosen = (all: { id: string; address: string; isDefault: boolean }[], ids?: string[] | null) => all.filter((c) => (ids == null ? c.isDefault : ids.includes(c.id))).map((c) => c.address)
  const contactLine = [...chosen(allE, x.emailIds), ...chosen(allP, x.phoneIds), d.from.website].filter(Boolean)
  const banner = x.banner || (d.project ? `${d.type.title} for ${d.project}` : '')

  const head = (title: string) => <header className="d-thead"><h2>{title}</h2><span className="num">{d.number ?? 'Draft'} · {d.from.name}</span></header>
  const topPart = (
    <>
      <header className="d-head">
        <div className="d-from">
          {d.from.logo && <img src={d.from.logo} alt={`${d.from.name} logo`} className="d-logo" style={{ height: `calc(var(--u) * ${LOGO[d.from.logoSize ?? 'm']})` }} />}
          <div className="d-from-t">
            <h2>{d.from.name}</h2>
            {d.from.address && <p>{d.from.address}</p>}
            <p>{[d.from.city, stateName(stateOf(d.from.gstin, d.from.state))].filter(Boolean).join(', ')}</p>
            <p>{contactLine.join(' · ')}</p>
          </div>
        </div>
        <div className="d-title"><h1>{d.type.title}</h1><span className="d-no num">{d.number ?? 'Draft'}</span></div>
      </header>

      <section className="d-meta">
        <F on={focus === 'bill'} k="bill" className="d-bill">
          <small>Bill to</small>
          <div className="d-bill-row">
            {b?.logo && <img src={b.logo} alt={`${b.company || b.name} logo`} className="d-clogo" />}
            <div>
              <b>{b?.company || (b ? attentionLine(b.honorific, b.name) : 'Choose a client')}</b>
              {b?.company && <p>Kind attention: {attentionLine(b.honorific, b.attention || b.name)}</p>}
            </div>
          </div>
          {b?.address && <p>{b.address}</p>}
          {(b?.area || b?.city || b?.pin) && <p>{[b.area, b.city, b.pin].filter(Boolean).join(', ')}</p>}
          <p>{[b?.gstin && `GSTIN ${b.gstin}`, b?.pan && !b?.gstin && `PAN ${b.pan}`].filter(Boolean).join(' · ')}</p>
        </F>
        <F on={focus === 'scope'} k="scope">
          <dl className="d-facts">
            <div><dt>Date</dt><dd className="num">{fmtDate(d.issued)}</dd></div>
            <div><dt>Invoice month</dt><dd>{MONTH.format(new Date(d.issued))}</dd></div>
            <div><dt>Due</dt><dd className="num">{fmtDate(d.due)}</dd></div>
            <div><dt>Financial year</dt><dd className="num">{financialYear(d.issued)}</dd></div>
            {d.from.gstin && <div><dt>GSTIN</dt><dd className="num">{d.from.gstin}</dd></div>}
            {d.from.pan && <div><dt>PAN</dt><dd className="num">{d.from.pan}</dd></div>}
            {d.gstPct > 0 && supply && <div><dt>Place of supply</dt><dd>{supply}</dd></div>}
            {x.category && <div><dt>Category</dt><dd>{x.category}</dd></div>}
            {x.completionDate && <div><dt>Completion</dt><dd className="num">{fmtDate(new Date(`${x.completionDate}T09:00:00+05:30`).toISOString())}</dd></div>}
            {x.plan.kind !== 'none' && <div><dt>Payment terms</dt><dd>{planSummary(x.plan.kind, x.plan.advancePct, x.plan.text)}</dd></div>}
            {top.map((f) => <div key={f.id}><dt>{f.label}</dt><dd>{showField(f, d.fields[f.id])}</dd></div>)}
          </dl>
        </F>
      </section>

      {(x.salutation || x.intro) && <div className="d-greet">{x.salutation && <p>{x.salutation}</p>}{x.intro && <p>{x.intro}</p>}</div>}
      {banner && <F on={focus === 'scope'}><p className="d-project">{banner}</p></F>}
    </>
  )
  const tableOf = (from: number, to: number) => (
    <F on={focus === 'items'} k="items">
      <table className="d-table">
        <thead><tr><th className="c-n">#</th><th>{d.type.descLabel}</th>{qty && <><th className="r">{d.type.qtyLabel}</th><th className="r">{d.type.rateLabel}</th></>}<th className="r">Amount</th></tr></thead>
        <tbody>
          {d.items.slice(from, to).map((i, k) => (
            <tr key={i.id}>
              <td className="c-n num">{String(from + k + 1).padStart(2, '0')}</td>
              <td>{i.desc || <span className="d-mute">Untitled line</span>}</td>
              {qty && <><td className="r num">{i.qty}{i.unit ? ` ${i.unit}` : ''}</td><td className="r num">{m(i.rate)}</td></>}
              <td className="r num">{m(Math.round(i.qty * i.rate))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </F>
  )
  const tailPart = (
    <>
      <F on={focus === 'totals'} k="totals" className="d-sum">
        <div className="d-words"><small>Amount in words</small><p>{amountInWords(isQuote ? t.total : Math.max(t.total - t.advance, 0), cur)}</p>{d.taxInclusive && d.gstPct > 0 && <p className="d-mute">Prices include GST.</p>}{cur !== 'INR' && d.gstPct === 0 && <p className="d-mute">Export of services without payment of tax.</p>}</div>
        <dl className="d-totals">
          <div><dt>Subtotal</dt><dd className="num">{m(t.subtotal)}</dd></div>
          {t.discount > 0 && <div><dt>Discount{x.discountPct ? ` (${x.discountPct}%)` : ''}</dt><dd className="num">-{m(t.discount)}</dd></div>}
          {d.gstPct > 0 && d.taxInclusive && <div><dt>Taxable value</dt><dd className="num">{m(t.taxable)}</dd></div>}
          {d.gstPct > 0 && (d.interState ? <div><dt>IGST {d.gstPct}%</dt><dd className="num">{m(t.gst)}</dd></div>
            : <><div><dt>CGST {half}%</dt><dd className="num">{m(Math.round(t.gst / 2))}</dd></div><div><dt>SGST {half}%</dt><dd className="num">{m(t.gst - Math.round(t.gst / 2))}</dd></div></>)}
          <div className="d-grand"><dt>Total</dt><dd className="num">{m(t.total)}</dd></div>
          {t.advance > 0 && <div><dt>Advance received</dt><dd className="num">-{m(t.advance)}</dd></div>}
          {!!t.paid && <div><dt>Paid</dt><dd className="num">-{m(t.paid)}</dd></div>}
          <div className="d-bal"><dt>{isQuote ? 'Quoted total' : 'Balance due'}</dt><dd className="num">{m(isQuote ? t.total : balance)}</dd></div>
        </dl>
      </F>

      {plan.length > 0 && (
        <table className="d-plan"><thead><tr><th>Payment schedule</th><th>When</th><th className="r">Amount</th></tr></thead>
          <tbody>{plan.map((r) => <tr key={r.label}><td>{r.label}</td><td>{r.when}</td><td className="r num">{r.amount == null ? '' : m(r.amount)}</td></tr>)}</tbody></table>
      )}

      {(bankOn || qrOn) && (
        <F on={focus === 'bank'} className="d-bank">
          {bankOn && <div className="d-bank-t">
            <small>Pay by bank transfer or UPI</small>
            <dl>
              {d.from.accountName && <div><dt>Account name</dt><dd>{d.from.accountName}</dd></div>}
              {d.from.bankName && <div><dt>Bank</dt><dd>{d.from.bankName}</dd></div>}
              {d.from.accountNo && <div><dt>Account no.</dt><dd className="num">{d.from.accountNo}</dd></div>}
              {d.from.ifsc && <div><dt>IFSC</dt><dd className="num">{d.from.ifsc}</dd></div>}
              {d.from.upiId && <div><dt>UPI ID</dt><dd>{d.from.upiId}</dd></div>}
              {x.showMobile && payPhone && <div><dt>Payment mobile</dt><dd className="num">{payPhone}</dd></div>}
            </dl>
          </div>}
          {qrOn && <div className="d-qr">{qrMode === 'image' ? <img src={d.from.qrImage} alt="Payment QR code" style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'contain', background: '#fff' }} /> : <QR value={upiLink(d.from.upiId!, d.from.name, balance, d.number ?? 'Invoice')} size={96} fluid />}<small>Scan to pay {m(balance)}</small></div>}
        </F>
      )}

      {bottom.map((f) => <div key={f.id} className="d-extra"><small>{f.label}</small><p>{showField(f, d.fields[f.id])}</p></div>)}
      {d.note && <p className="d-note">{d.note}</p>}
      {isVoid && d.voidReason && <p className="d-void">This invoice was cancelled: {d.voidReason}</p>}

      <F on={focus === 'sign'} className={`d-sign ${d.acceptance?.required ? 'd-sign-2' : ''}`}>
        {d.acceptance?.required && (
          <div>
            {d.acceptance.signature && <img src={d.acceptance.signature} alt={`Signature of ${d.acceptance.name}`} className="d-sig-i" />}
            {d.acceptance.at && !d.acceptance.signature && <span className="d-sig-t" style={{ fontFamily: "'Great Vibes', cursive" }}>{d.acceptance.name}</span>}
            <span className="d-sig-l">{d.acceptance.at ? `Accepted by ${d.acceptance.name}, ${fmtDate(d.acceptance.at)}` : `Accepted by ${b?.company || b?.name || 'the client'}`}</span>
          </div>
        )}
        <div>
          {sig?.kind === 'typed' && <span className="d-sig-t" style={{ fontFamily: `${SIG_FONT[sig.font ?? 'great-vibes'] ?? SIG_FONT['great-vibes']}, cursive` }}>{sig.text}</span>}
          {sig?.kind === 'image' && sig.image && <img src={sig.image} alt={`Signature of ${d.from.name}`} className="d-sig-i" />}
          <span className="d-sig-l">Authorised signatory, {d.from.name}</span>
        </div>
      </F>
    </>
  )
  const invoicePages = inv.map((p, i) => (
    <Page key={`i${i}`} n={i + 1} of={total} label={p.first ? d.type.title : `${d.type.title}, continued`}>
      {p.first ? topPart : head(p.to > p.from ? 'Items (continued)' : 'Totals and payment')}
      {p.to > p.from && tableOf(p.from, p.to)}
      {p.tail && tailPart}
      {p.first && stamp && <div className={`d-stamp d-stamp-${d.status}`} aria-hidden>{stamp}</div>}
    </Page>
  ))

  const pages = [
    ...invoicePages,
    ...terms.map((blocks, i) => (
      <Page key={`t${i}`} n={inv.length + i + 1} of={total} label="Terms and conditions">
        {head(i ? 'Terms and conditions (continued)' : 'Terms and conditions')}
        <F on={focus === 'terms'} className="d-terms"><Blocks blocks={blocks} /></F>
        {i === terms.length - 1 && <div className="d-accept"><div><span className="d-sig-l">For {d.from.name}</span></div><div><span className="d-sig-l">Accepted by {b?.company || b?.name || 'the client'}</span></div></div>}
      </Page>
    )),
    ...annex.map((blocks, i) => (
      <Page key={`a${i}`} n={inv.length + terms.length + i + 1} of={total} label="Annexure">
        {head(i ? 'Annexure (continued)' : 'Annexure: project scope')}
        <div className="d-terms"><Blocks blocks={blocks} /></div>
      </Page>
    )),
  ]

  return (
    <div className={`doc lay-${x.layout ?? 'classic'}`} style={theme.vars as CSSProperties}>
      {only === undefined ? pages.map((p, i) => <div className="dp-wrap" key={i}>{p}</div>) : <div className="dp-wrap">{pages[Math.min(only, pages.length - 1)]}</div>}
    </div>
  )
}
