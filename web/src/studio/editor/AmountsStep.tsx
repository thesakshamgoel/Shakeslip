import { Info } from 'lucide-react'
import { useState } from 'react'
import { Chip } from '../../components/Chip'
import { Field } from '../../components/Field'
import { isInterState, stateName, stateOf } from '../../lib/gst'
import { money, rupees, toPaise } from '../../lib/money'
import type { Business, InvoiceType, Link as ClientLink, Totals } from '../../lib/types'
import type { Memory } from './ItemsStep'
import { LinesTable } from './LinesTable'
import type { Draft } from './state'

type T = Pick<Totals, 'subtotal' | 'discount' | 'taxable' | 'gst' | 'total' | 'advance'>

/* Step 3: what it costs. Lines, tax, adjustments, and a live summary. */
export function AmountsStep({ d, set, type, link, from, t, memory, showErrors }: { d: Draft; set: (p: Partial<Draft>, m?: string) => void; type: InvoiceType; link?: ClientLink; from: Business; t: T; memory: Memory[]; showErrors: boolean }) {
  const a = stateOf(from.gstin, from.state), b = stateOf(link?.gstin, link?.state)
  const inter = isInterState(a, b)
  const half = d.gstPct / 2
  const [mode, setMode] = useState<'amt' | 'pct'>(d.extra.discountPct ? 'pct' : 'amt')
  const pct = d.extra.discountPct ?? 0
  const setPct = (n: number) => set({ discount: 0, extra: { ...d.extra, discountPct: Math.min(100, Math.max(0, n)) } }, 'discount')
  return (
    <div className="st">
      <section className="st-block">
        <div className="st-row"><h3>Lines</h3><span className="hint">Enter adds a line. Drag the handle to reorder.</span></div>
        <LinesTable d={d} set={set} type={type} memory={memory} showErrors={showErrors} />
      </section>

      {type.taxMode === 'gst' && (
        <section className="st-block">
          <h3>GST</h3>
          <div className="chips2">{[0, 5, 12, 18, 28].map((g) => <Chip key={g} icon={false} on={d.gstPct === g} onClick={() => set({ gstPct: g })}>{g === 0 ? 'No GST' : `${g}%`}</Chip>)}</div>
          <div className="seg2">
            <button type="button" className="seg2-b tap" aria-pressed={!d.taxInclusive} onClick={() => set({ taxInclusive: false })}>Add GST on top</button>
            <button type="button" className="seg2-b tap" aria-pressed={d.taxInclusive} onClick={() => set({ taxInclusive: true })}>Prices include GST</button>
          </div>
          {d.gstPct > 0 && <p className="explain"><Info size={15} aria-hidden />
            {inter ? <>Different states ({stateName(a)} to {stateName(b)}), so <b>IGST {d.gstPct}%</b>.</> : a && b ? <>Same state ({stateName(a)}), so <b>CGST {half}% + SGST {half}%</b>.</> : <>Add both GSTINs or states and we pick IGST or CGST + SGST for you.</>}</p>}
        </section>
      )}

      {(type.discount || type.advance) && (
        <section className="st-block">
          <h3>Discount and advance</h3>
          <div className="grid2">
            {type.discount && (
              <div className="field disc">
                <span>Discount</span>
                <div className="seg2"><button type="button" className="seg2-b tap" aria-pressed={mode === 'amt'} onClick={() => { setMode('amt'); set({ extra: { ...d.extra, discountPct: 0 } }) }}>Amount (₹)</button><button type="button" className="seg2-b tap" aria-pressed={mode === 'pct'} onClick={() => { setMode('pct'); if (!pct) setPct(10) }}>Percent (%)</button></div>
                {mode === 'pct'
                  ? <><div className="chips2">{[5, 10, 15, 20, 25].map((n) => <Chip key={n} icon={false} on={pct === n} onClick={() => setPct(n)}>{n}%</Chip>)}</div>
                    <Field label="Or type a percent" inputMode="decimal" value={pct ? String(pct) : ''} maxLength={5} onChange={(e) => setPct(Number(e.target.value.replace(/[^\d.]/g, '')) || 0)} hint={`${pct}% of ${money(t.subtotal)} is ${money(t.discount)}. Taken off before tax.`} /></>
                  : <Field label="Discount (₹)" inputMode="decimal" value={rupees(d.discount)} onChange={(e) => set({ discount: toPaise(e.target.value.replace(/[^\d.]/g, '')) }, 'discount')} hint="Taken off before tax." />}
              </div>
            )}
            {type.advance && <Field label="Advance already received (₹)" inputMode="decimal" value={rupees(d.advance)} onChange={(e) => set({ advance: toPaise(e.target.value.replace(/[^\d.]/g, '')) }, 'advance')} hint="Shown as received; the balance is what they owe." />}
          </div>
        </section>
      )}

      <section className="st-block sum-card" aria-label="Summary">
        <dl>
          <div><dt>Subtotal</dt><dd className="num">{money(t.subtotal)}</dd></div>
          {t.discount > 0 && <div><dt>Discount{pct ? ` (${pct}%)` : ''}</dt><dd className="num">-{money(t.discount)}</dd></div>}
          {d.gstPct > 0 && <div><dt>{inter ? `IGST ${d.gstPct}%` : `GST ${d.gstPct}%`}{d.taxInclusive ? ' (included)' : ''}</dt><dd className="num">{money(t.gst)}</dd></div>}
          <div className="sum-total"><dt>Total</dt><dd className="num">{money(t.total)}</dd></div>
          {t.advance > 0 && <div><dt>Advance received</dt><dd className="num">-{money(t.advance)}</dd></div>}
          <div className="sum-bal"><dt>They owe</dt><dd className="num">{money(Math.max(t.total - t.advance, 0))}</dd></div>
        </dl>
      </section>
    </div>
  )
}
