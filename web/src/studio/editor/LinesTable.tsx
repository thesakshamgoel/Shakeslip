import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react'
import { Copy, GripVertical, History, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button, IconButton } from '../../components/Button'
import { money, rupees, toPaise } from '../../lib/money'
import { springSoft } from '../../lib/motion'
import type { InvoiceType, LineItem } from '../../lib/types'
import { blankLine, type Memory } from './ItemsStep'
import type { Draft } from './state'

const UNITS = ['Days', 'Hours', 'Package', 'Project', 'Photos', 'Videos', 'Pages', 'Months', 'Units', 'Sessions']

/* Line items as a real table: drag to reorder, duplicate, Enter for a new row, memory of past items. */
export function LinesTable({ d, set, type, memory, showErrors }: { d: Draft; set: (p: Partial<Draft>, m?: string) => void; type: InvoiceType; memory: Memory[]; showErrors: boolean }) {
  const qty = type.lineMode === 'qty_rate'
  const items = d.items
  const wrap = useRef<HTMLDivElement>(null)
  const put = (id: string, patch: Partial<LineItem>, m?: string) => set({ items: items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }, m)
  function add(after?: string) {
    const row = blankLine()
    const at = after ? items.findIndex((i) => i.id === after) + 1 : items.length
    set({ items: [...items.slice(0, at), row, ...items.slice(at)] })
    setTimeout(() => wrap.current?.querySelector<HTMLTextAreaElement>(`[data-row="${row.id}"] textarea`)?.focus(), 60)
  }
  return (
    <div className={`lt ${qty ? '' : 'lt-simple'}`} ref={wrap}>
      <div className="lt-head" aria-hidden><span /><span>{type.descLabel}</span>{qty && <><span>{type.qtyLabel}</span><span>Unit</span></>}<span>{qty ? type.rateLabel : 'Amount'}</span><span className="r">Total</span><span /></div>
      <Reorder.Group axis="y" values={items} onReorder={(v) => set({ items: v })} className="lt-body">
        <AnimatePresence initial={false}>
          {items.map((i, n) => <Row key={i.id} i={i} n={n} qty={qty} cur={d.extra.currency} memory={memory} put={put} canDelete={items.length > 1} showErrors={showErrors}
            onDelete={() => set({ items: items.filter((x) => x.id !== i.id) })} onCopy={() => { const c = { ...i, id: crypto.randomUUID() }; const at = items.findIndex((x) => x.id === i.id) + 1; set({ items: [...items.slice(0, at), c, ...items.slice(at)] }) }} onEnter={() => add(i.id)} />)}
        </AnimatePresence>
      </Reorder.Group>
      <datalist id="units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
      <Button variant="ghost" onClick={() => add()}><Plus size={18} aria-hidden />Add a line</Button>
    </div>
  )
}

function Row({ i, n, qty, cur, memory, put, canDelete, onDelete, onCopy, onEnter, showErrors }: {
  i: LineItem; n: number; qty: boolean; cur: string; memory: Memory[]; put: (id: string, p: Partial<LineItem>, m?: string) => void
  canDelete: boolean; onDelete: () => void; onCopy: () => void; onEnter: () => void; showErrors: boolean
}) {
  const drag = useDragControls()
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const q = i.desc.trim().toLowerCase()
  const list = q.length < 2 ? [] : memory.filter((m) => m.desc.toLowerCase() !== q && m.desc.toLowerCase().includes(q)).slice(0, 5)
  const show = open && list.length > 0
  const amount = Math.round(i.qty * i.rate)
  const errDesc = showErrors && !i.desc.trim() && amount > 0
  const errAmt = showErrors && !!i.desc.trim() && amount === 0
  const enterNext = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter() } }
  return (
    <Reorder.Item value={i} dragListener={false} dragControls={drag} as="div" className="lt-row" data-row={i.id}
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.14 } }} transition={springSoft} whileDrag={{ scale: 1.02, boxShadow: '0 18px 40px -16px rgba(0,0,0,.6)' }}>
      <button type="button" className="lt-grip" aria-label={`Drag to move line ${n + 1}`} onPointerDown={(e) => drag.start(e)}><GripVertical size={16} /><span className="num">{n + 1}</span></button>
      <div className={`lt-desc ${errDesc ? 'err shake' : ''}`}>
        <textarea className="input" rows={1} value={i.desc} maxLength={300} placeholder="What did you deliver?" aria-label={`Line ${n + 1} description`} aria-invalid={errDesc}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} onChange={(e) => { put(i.id, { desc: e.target.value }, `desc-${i.id}`); setOpen(true); setHi(0) }}
          onKeyDown={(e) => {
            if (show && e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(list.length - 1, h + 1)); return }
            if (show && e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); return }
            if (show && e.key === 'Enter') { e.preventDefault(); const m = list[hi]; put(i.id, { desc: m.desc, rate: m.rate, qty: qty ? m.qty || 1 : 1 }); setOpen(false); return }
          }} />
        <AnimatePresence>
          {show && (
            <motion.ul className="suggest" role="listbox" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}>
              {list.map((m, k) => <li key={m.desc} role="option" aria-selected={k === hi} onMouseDown={(e) => { e.preventDefault(); put(i.id, { desc: m.desc, rate: m.rate, qty: qty ? m.qty || 1 : 1 }); setOpen(false) }}><History size={14} aria-hidden /><span>{m.desc}</span><small className="num">{money(m.rate)}</small></li>)}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
      {qty && <label className="lt-cell lt-qty" data-l="Qty"><input className="input num" inputMode="decimal" aria-label={`Line ${n + 1} quantity`} value={i.qty} onKeyDown={enterNext} onChange={(e) => put(i.id, { qty: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 }, `qty-${i.id}`)} /></label>}
      {qty && <label className="lt-cell lt-unit" data-l="Unit"><input className="input" list="units" placeholder="Days" aria-label={`Line ${n + 1} unit`} value={i.unit ?? ''} maxLength={24} onKeyDown={enterNext} onChange={(e) => put(i.id, { unit: e.target.value }, `unit-${i.id}`)} /></label>}
      <label className={`lt-cell lt-rate ${errAmt ? 'err shake' : ''}`} data-l={qty ? 'Rate' : 'Amount'}><span aria-hidden>₹</span><input className="input num" inputMode="decimal" aria-label={`Line ${n + 1} rate`} aria-invalid={errAmt} value={rupees(i.rate)} onKeyDown={enterNext} onChange={(e) => put(i.id, { rate: toPaise(e.target.value.replace(/[^\d.]/g, '')) }, `rate-${i.id}`)} /></label>
      <span className="lt-amt num r">{money(amount, cur)}</span>
      <span className="lt-acts">
        <IconButton label={`Duplicate line ${n + 1}`} onClick={onCopy}><Copy size={16} /></IconButton>
        <IconButton label={`Remove line ${n + 1}`} disabled={!canDelete} onClick={onDelete}><Trash2 size={16} /></IconButton>
      </span>
    </Reorder.Item>
  )
}
