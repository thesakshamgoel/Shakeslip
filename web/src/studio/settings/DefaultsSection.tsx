import { useState } from 'react'
import { DocViewer } from '../../components/DocViewer'
import { DEFAULT_EXTRA, type DocData } from '../../components/InvoiceDocument'
import { liveTotals } from '../../lib/format'
import type { Extra, InvoiceType } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { PenLine } from 'lucide-react'
import { BlockEditorDialog, BlockPreview } from '../../components/BlockEditor'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { errText, put } from '../../lib/api'
import { CLAUSES, clauseTitle } from '../../lib/clauses'
import { useSession } from '../../lib/session'
import { useToast } from '../../lib/toast'
import { DesignPicker } from '../../components/DesignPicker'

/* What every new invoice starts with: its design and its terms. */
export function DefaultsSection() {
  const { me, refresh } = useSession()
  const b = me!.business!
  const toast = useToast()
  const [theme, setTheme] = useState(b.defaultTheme ?? 'classic')
  const [layout, setLayout] = useState(b.defaultLayout ?? 'classic')
  const [terms, setTerms] = useState<string[]>(b.defaultTerms ?? [])
  const [custom, setCustom] = useState(b.defaultCustomTerms ?? '')
  const [write, setWrite] = useState(false)
  const [busy, setBusy] = useState(false)
  async function save() {
    if (busy) return
    setBusy(true)
    try { await put('/studio/defaults', { theme, layout, terms, customTerms: custom }); await refresh(); toast.ok('Defaults saved. New invoices start with them.') } catch (x) { toast.bad(errText(x)) } finally { setBusy(false) }
  }
  const types = useApi<InvoiceType[]>('/studio/types').data
  const type = types?.find((t) => t.taxMode === 'gst') ?? types?.[0]
  const lines = [{ id: 's1', desc: 'Sample service', qty: 2, rate: 1500000 }, { id: 's2', desc: 'Another line', qty: 1, rate: 800000 }]
  const preview: DocData | null = type ? {
    number: `${type.prefix}/2026-27/0001`, type, theme, billTo: { name: 'Sample Client', company: 'Sample Company', gstin: '', city: 'Mumbai', address: '', email: '', phone: '' },
    from: b, items: lines, fields: {}, gstPct: type.taxMode === 'none' ? 0 : type.defaultGst, issued: new Date().toISOString(), due: new Date(Date.now() + 15 * 864e5).toISOString(), note: '', project: '',
    terms, taxInclusive: false, interState: false, totals: liveTotals(lines, type.taxMode === 'none' ? 0 : type.defaultGst, 0, 0), extra: { ...DEFAULT_EXTRA, layout: layout as Extra['layout'], customTerms: custom },
  } : null
  return (
    <section className="set-card">
      <header><h2>Invoice defaults</h2><p>New invoices start with this design and these terms. You can still change them on any invoice.</p></header>
      <div className="field"><span>Default design</span><DesignPicker id="df" layout={layout} theme={theme} onLayout={setLayout} onTheme={setTheme} /></div>
      {preview && <div className="field def-prev"><span>Preview</span><small className="hint">A sample invoice with your business details, this design and your default terms.</small><DocViewer d={preview} printable={false} /></div>}
      <div className="field"><span>Default terms <span className="count num">{terms.length}</span></span>
        {CLAUSES.map((g) => (
          <div key={g.id} className="cg"><small>{g.label}</small>
            <div className="chips2">{g.clauses.map((c) => <Chip key={c.id} on={terms.includes(c.text)} onClick={() => setTerms((l) => (l.includes(c.text) ? l.filter((x) => x !== c.text) : [...l, c.text]))}>{clauseTitle(c)}</Chip>)}</div>
          </div>
        ))}
      </div>
      <div className="field"><span>Your own standard terms</span>
        <BlockPreview value={custom} empty="Nothing yet. Write terms that go on every new invoice." />
        <div><Button onClick={() => setWrite(true)}><PenLine size={16} aria-hidden />{custom.trim() ? 'Edit your terms' : 'Write your terms'}</Button></div>
        <BlockEditorDialog open={write} onClose={() => setWrite(false)} title="Your standard terms" value={custom} onChange={setCustom} />
      </div>
      <footer><Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving' : 'Save defaults'}</Button></footer>
    </section>
  )
}
