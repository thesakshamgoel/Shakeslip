import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { Select } from '../components/Select'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, IconButton } from '../components/Button'
import { Field, TextArea } from '../components/Field'
import { Chip } from '../components/Chip'
import { DocViewer } from '../components/DocViewer'
import { CLAUSES, clauseTitle } from '../lib/clauses'
import { errText, post, put } from '../lib/api'
import { liveTotals } from '../lib/format'
import { useSession } from '../lib/session'
import { useToast } from '../lib/toast'
import type { CustomField, FieldKind, InvoiceType } from '../lib/types'
import { useApi } from '../lib/useApi'
import { invoiceThemes } from '../themes/invoice'
import './editor.css'
import './types.css'

const BLANK: InvoiceType = { name: '', title: 'Invoice', prefix: 'INV', lineMode: 'qty_rate', descLabel: 'Description', qtyLabel: 'Qty', rateLabel: 'Rate', taxMode: 'gst', defaultGst: 18, discount: true, advance: true, dueDays: 15, defaultNote: 'Thank you for your business.', theme: 'classic', fields: [], defaultTerms: [] }
const KINDS: { id: FieldKind; label: string }[] = [{ id: 'text', label: 'Short text' }, { id: 'longtext', label: 'Long text' }, { id: 'number', label: 'Number' }, { id: 'date', label: 'Date' }, { id: 'select', label: 'Choose from a list' }]
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20) || 'field'

export default function TypeBuilder() {
  const { id } = useParams()
  const existing = useApi<InvoiceType[]>('/studio/types')
  if (!existing.data) return <div aria-busy="true" style={{ minHeight: 400 }} />
  const base = id ? existing.data.find((t) => t.id === id) : undefined
  if (id && !base) return <div className="empty"><h3>Type not found</h3><Link to="/studio/types"><Button>Back to invoice types</Button></Link></div>
  return <Builder key={id ?? 'new'} initial={base ?? BLANK} id={id} />
}

function Builder({ initial, id }: { initial: InvoiceType; id?: string }) {
  const [t, setT] = useState<InvoiceType>(initial)
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const toast = useToast()
  const { me } = useSession()
  const set = (p: Partial<InvoiceType>) => setT((x) => ({ ...x, ...p }))
  const setField = (i: number, p: Partial<CustomField>) => set({ fields: t.fields.map((f, n) => (n === i ? { ...f, ...p } : f)) })
  const addField = () => set({ fields: [...t.fields, { id: slug(`field ${t.fields.length + 1}`), label: '', kind: 'text', required: false, place: 'top' }] })

  async function save() {
    if (busy) return
    const clean = { ...t, name: t.name.trim() || t.title, fields: t.fields.map((f, i, all) => { const base = slug(f.label); const dupes = all.slice(0, i).filter((x) => slug(x.label) === base).length; return { ...f, label: f.label.trim(), id: dupes ? `${base}_${dupes + 1}` : base, options: f.kind === 'select' ? f.options?.filter(Boolean) : undefined } }) }
    if (clean.fields.some((f) => !f.label)) { toast.bad('Give every extra field a name, or remove it.'); return }
    if (clean.fields.some((f) => f.kind === 'select' && !f.options?.length)) { toast.bad('Add at least one choice to each list field.'); return }
    setBusy(true)
    try { delete clean.id; if (id) await put(`/studio/types/${id}`, clean); else await post('/studio/types', clean); toast.ok('Invoice type saved.'); nav('/studio/types') } catch (e) { toast.bad(errText(e)) } finally { setBusy(false) }
  }

  const sample = [{ id: 's1', desc: 'Sample service', qty: 2, rate: 1500000 }, { id: 's2', desc: 'Another line', qty: 1, rate: 800000 }]
  const tot = liveTotals(sample, t.taxMode === 'none' ? 0 : t.defaultGst, 0, 0)
  const sampleFields = Object.fromEntries(t.fields.map((f) => [f.id, f.kind === 'date' ? '2026-12-01' : f.kind === 'select' ? f.options?.[0] ?? 'Option' : `Sample ${f.label || 'value'}`]))
  const preview = {
    number: `${t.prefix || 'INV'}/2026-27/0001`, type: t, theme: t.theme, billTo: { name: 'Sample Client', company: 'Sample Company', gstin: '', city: 'Mumbai', address: '', email: '', phone: '' },
    from: me!.business!, items: sample, fields: sampleFields, gstPct: t.taxMode === 'none' ? 0 : t.defaultGst, issued: new Date().toISOString(), due: new Date(Date.now() + t.dueDays * 864e5).toISOString(),
    note: t.defaultNote, project: 'Sample project', terms: t.defaultTerms ?? [], taxInclusive: false, interState: false, totals: tot,
  }
  const terms = t.defaultTerms ?? []

  return (
    <>
      <Link to="/studio/types" className="back tap"><ArrowLeft size={16} aria-hidden />Invoice types</Link>
      <div className="ph"><div><h1>{id ? 'Edit invoice type' : 'Design your invoice type'}</h1><p>Choose what appears on it. The preview updates as you go. Invoices already sent keep the version they were sent with.</p></div></div>
      <div className="ed">
        <form className="ed-form" onSubmit={(e) => e.preventDefault()}>
          <section className="ed-sec">
            <h2>The basics</h2>
            <Field label="Name (only you see this)" value={t.name} onChange={(e) => set({ name: e.target.value })} placeholder="For example, Wedding shoot" maxLength={40} />
            <div className="grid2">
              <Field label="Title on the document" value={t.title} onChange={(e) => set({ title: e.target.value })} maxLength={40} hint="Tax invoice, Quotation, Proforma..." />
              <Field label="Number starts with" value={t.prefix} onChange={(e) => set({ prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) })} hint="Like WED gives WED/2026-27/0001" />
            </div>
          </section>

          <section className="ed-sec">
            <h2>How do you charge?</h2>
            <div className="roles" role="group" aria-label="Line items">
              <button type="button" className="role tap" aria-pressed={t.lineMode === 'qty_rate'} onClick={() => set({ lineMode: 'qty_rate' })}><b>Quantity × rate</b><span>Hours, days, units</span></button>
              <button type="button" className="role tap" aria-pressed={t.lineMode === 'amount_only'} onClick={() => set({ lineMode: 'amount_only' })}><b>Just an amount</b><span>One price per line</span></button>
            </div>
            <div className="grid2">
              <Field label="First column name" value={t.descLabel} onChange={(e) => set({ descLabel: e.target.value })} maxLength={30} />
              {t.lineMode === 'qty_rate' && <Field label="Quantity name" value={t.qtyLabel} onChange={(e) => set({ qtyLabel: e.target.value })} maxLength={20} hint="Qty, Hours, Days" />}
              {t.lineMode === 'qty_rate' && <Field label="Rate name" value={t.rateLabel} onChange={(e) => set({ rateLabel: e.target.value })} maxLength={20} hint="Rate, Day rate" />}
            </div>
          </section>

          <section className="ed-sec">
            <h2>Tax, discount and dates</h2>
            <div className="grid2">
              <Select label="Tax" value={t.taxMode} onChange={(v) => set({ taxMode: v as 'gst' | 'none' })} options={[{ value: 'gst', label: 'GST' }, { value: 'none', label: 'No tax' }]} />
              {t.taxMode === 'gst' && <Select custom={{ numeric: true, min: 0, max: 28, suffix: '%' }} label="Usual GST rate" value={String(t.defaultGst)} onChange={(v) => set({ defaultGst: Number(v) })} options={[0, 5, 12, 18, 28].map((g) => ({ value: String(g), label: `${g}%` }))} />}
              <Field label="Usually due in (days)" inputMode="numeric" value={t.dueDays} onChange={(e) => set({ dueDays: Math.min(365, Number(e.target.value.replace(/\D/g, '')) || 0) })} />
              <Select label="Default look" value={t.theme} onChange={(v) => set({ theme: v })} options={invoiceThemes.map((x) => ({ value: x.id, label: x.name, hint: x.blurb }))} />
            </div>
            <label className="check"><input type="checkbox" checked={t.discount} onChange={(e) => set({ discount: e.target.checked })} /><span>Allow a discount</span></label>
            <label className="check"><input type="checkbox" checked={t.advance} onChange={(e) => set({ advance: e.target.checked })} /><span>Allow an advance payment</span></label>
            <TextArea label="Default note" value={t.defaultNote} onChange={(e) => set({ defaultNote: e.target.value })} maxLength={400} />
          </section>

          <section className="ed-sec">
            <h2>Extra fields</h2>
            <p className="hint">Add anything your business needs on this document, like an event date, a venue or a PO number.</p>
            {t.fields.map((f, i) => (
              <div className="xf" key={i}>
                <Field label="Field name" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} maxLength={40} />
                <Select label="Type" value={f.kind} onChange={(v) => setField(i, { kind: v as FieldKind })} options={KINDS.map((k) => ({ value: k.id, label: k.label }))} />
                <Select label="Shown" value={f.place} onChange={(v) => setField(i, { place: v as 'top' | 'bottom' })} options={[{ value: 'top', label: 'Near the top' }, { value: 'bottom', label: 'Near the bottom' }]} />
                <label className="check"><input type="checkbox" checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} /><span>Must be filled in</span></label>
                {f.kind === 'select' && <Field label="Choices, separated by commas" defaultValue={f.options?.join(', ') ?? ''} onBlur={(e) => setField(i, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />}
                <IconButton label={`Remove ${f.label || 'field'}`} onClick={() => set({ fields: t.fields.filter((_, n) => n !== i) })}><Trash2 size={18} /></IconButton>
              </div>
            ))}
            {t.fields.length < 12 && <Button variant="ghost" onClick={addField}><Plus size={18} aria-hidden />Add a field</Button>}
          </section>

          <section className="ed-sec">
            <h2>Standard terms</h2>
            <p className="hint">Picked here, they are added to every new invoice of this type. You can still change them per invoice.</p>
            {CLAUSES.map((g) => (
              <div key={g.id} className="cg"><small>{g.label}</small>
                <div className="chips2">{g.clauses.map((c) => <Chip key={c.id} on={terms.includes(c.text)} onClick={() => set({ defaultTerms: terms.includes(c.text) ? terms.filter((x) => x !== c.text) : [...terms, c.text] })}>{clauseTitle(c)}</Chip>)}</div>
              </div>
            ))}
          </section>

          <section className="ed-sec"><Button variant="primary" block disabled={busy || !t.title.trim()} onClick={save}><Save size={18} aria-hidden />{busy ? 'Saving' : 'Save invoice type'}</Button></section>
        </form>
        <div className="ed-prev"><DocViewer d={preview} printable={false} /></div>
      </div>
    </>
  )
}
