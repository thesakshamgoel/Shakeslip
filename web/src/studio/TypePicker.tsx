import { ArrowRight, Ban, Calculator, CalendarRange, CircleSlash, FileSignature, Hash, ListPlus, Percent, Plus, Receipt, ReceiptIndianRupee, RotateCcw, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listDrafts } from './editor/localDraft'
import type { InvoiceType } from '../lib/types'
import '../components/page.css'
import './types.css'

/* What kind of document this is, drawn as an icon: a quotation, a GST tax invoice, a plain bill, or one of your own. */
function kindIcon(t: InvoiceType): LucideIcon {
  if (/quot|estimate|proposal/i.test(`${t.title} ${t.name}`)) return FileSignature
  if (/event|service|project|retainer|day/i.test(`${t.name} ${t.rateLabel ?? ''}`)) return CalendarRange
  return t.taxMode === 'gst' ? ReceiptIndianRupee : Receipt
}
const calc = (t: InvoiceType) => (t.lineMode === 'qty_rate' ? `${t.qtyLabel} × ${t.rateLabel}` : 'One amount per line')

function Card({ t, client }: { t: InvoiceType; client?: string | null }) {
  const Icon = kindIcon(t)
  return (
    <Link to={`/studio/new?type=${t.id}${client ? `&client=${client}` : ''}`} className="tcard tap">
      <span className="tcard-top">
        <span className="tcard-ic" aria-hidden><Icon size={24} /></span>
        <span className={`tax-badge ${t.taxMode === 'gst' ? 'is-gst' : 'is-none'}`}>
          {t.taxMode === 'gst' ? <Percent size={14} aria-hidden /> : <Ban size={14} aria-hidden />}
          {t.taxMode === 'gst' ? `GST ${t.defaultGst}%` : 'No tax'}
        </span>
      </span>
      <b>{t.name}</b>
      <span className="tcard-facts">
        <span><Calculator size={15} aria-hidden />{calc(t)}</span>
        {t.fields.length > 0 && <span><ListPlus size={15} aria-hidden />{t.fields.length} extra field{t.fields.length > 1 ? 's' : ''}</span>}
        <span className="num"><Hash size={15} aria-hidden />{t.prefix}/2026-27/0001</span>
      </span>
      <span className="tcard-go">Use this type<ArrowRight size={16} aria-hidden /></span>
    </Link>
  )
}

function Group({ icon: Icon, title, hint, items, client }: { icon: LucideIcon; title: string; hint: string; items: InvoiceType[]; client?: string | null }) {
  if (!items.length) return null
  return (
    <section className="tgroup" aria-label={title}>
      <header className="tgroup-h"><span className="tgroup-ic" aria-hidden><Icon size={20} /></span><div><h2>{title}</h2><p>{hint}</p></div></header>
      <div className="tcards">{items.map((t) => <Card key={t.id} t={t} client={client} />)}</div>
    </section>
  )
}

/* Step one of creating an invoice: choose a type, or design your own. */
export default function TypePicker({ types, client }: { types: InvoiceType[]; client?: string | null }) {
  const [drafts] = useState(listDrafts)
  return (
    <>
      <div className="ph"><div><h1>What are you creating?</h1><p>Pick an invoice type. Each one has its own fields, tax and numbering.</p></div></div>
      {drafts.length > 0 && (
        <section className="resume" aria-label="Unfinished invoices">
          <h2>Pick up where you left off</h2>
          {drafts.map(({ key, s }) => {
            const t = types.find((x) => x.id === s.typeId)
            return t && <Link key={key} to={`/studio/new?type=${t.id}`} className="resume-i tap"><RotateCcw size={18} aria-hidden /><span><b>{t.name}{s.client ? `, ${s.client}` : ''}</b><small>Unsaved, last edited {new Date(s.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</small></span></Link>
          })}
        </section>
      )}
      <Group icon={ReceiptIndianRupee} title="With GST" hint="CGST and SGST within the state, IGST across states. Worked out for you." items={types.filter((t) => t.taxMode === 'gst')} client={client} />
      <Group icon={CircleSlash} title="Without tax" hint="Simple bills with no tax added on top." items={types.filter((t) => t.taxMode !== 'gst')} client={client} />
      <Link to="/studio/types/new" className="tcard-new-row tap"><span className="tcard-ic" aria-hidden><Plus size={24} /></span><span><b>Design your own</b><small>Choose the fields, columns and tax that fit your business.</small></span><ArrowRight size={18} aria-hidden /></Link>
    </>
  )
}
