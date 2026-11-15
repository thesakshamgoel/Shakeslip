import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { usePlacement } from '../lib/placement'
import './select.css'

export type Option = { value: string; label: string; hint?: string }

/* Our own dropdown: the same on every device, keyboard friendly, long text wraps (never "..."),
   and a search box appears when there are many options. A hidden input keeps it working in forms. */
export function Select({ label, value, options, onChange, name, placeholder = 'Choose one', disabled, hint, error }: {
  label?: string; value: string; options: Option[]; onChange?: (v: string) => void; name?: string; placeholder?: string; disabled?: boolean; hint?: string; error?: string
}) {
  const [open, setOpen] = useState(false)
  const [cur, setCur] = useState(value)
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const id = useId()
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const pos = usePlacement(open, box, 340)
  useEffect(() => setCur(value), [value])
  const list = useMemo(() => (q ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q.toLowerCase())) : options), [q, options])
  const sel = options.find((o) => o.value === cur)
  useEffect(() => {
    if (!open) return
    setQ(''); setHi(Math.max(0, options.findIndex((o) => o.value === cur)))
    const out = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', out)
    return () => document.removeEventListener('pointerdown', out)
  }, [open, cur, options])
  function pick(o: Option) { setCur(o.value); onChange?.(o.value); setOpen(false); btn.current?.focus() }
  function key(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); return }
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(true); return }
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(list.length - 1, h + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
    if (e.key === 'Enter') { e.preventDefault(); if (list[hi]) pick(list[hi]) }
  }
  return (
    <div className={`field sel ${error ? 'has-error' : ''}`} ref={box} onKeyDown={key}>
      {label && <span id={`${id}-l`}>{label}</span>}
      {name && <input type="hidden" name={name} value={cur} />}
      <button ref={btn} type="button" className="input sel-btn" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-labelledby={label ? `${id}-l` : undefined} onClick={() => setOpen((o) => !o)}>
        <span className={sel ? '' : 'sel-ph'}>{sel?.label ?? placeholder}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="sel-chev"><ChevronDown size={18} aria-hidden /></motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className={`sel-pop ${pos.up ? 'sel-up' : ''}`} initial={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: pos.up ? 4 : -4, scale: 0.98 }} transition={{ type: 'spring', stiffness: 520, damping: 34 }}>
            {options.length > 8 && <label className="sel-search"><Search size={15} aria-hidden /><input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setHi(0) }} placeholder="Search" aria-label="Search options" /></label>}
            <ul role="listbox" aria-labelledby={label ? `${id}-l` : undefined}>
              {list.length === 0 && <li className="sel-empty">Nothing matches.</li>}
              {list.map((o, i) => (
                <li key={o.value} role="option" aria-selected={o.value === cur} className={i === hi ? 'hi' : ''} onPointerMove={() => setHi(i)} onClick={() => pick(o)}>
                  <span><b>{o.label}</b>{o.hint && <small>{o.hint}</small>}</span>
                  {o.value === cur && <Check size={16} aria-hidden />}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
      {error ? <small className="field-err">{error}</small> : hint && <small className="hint">{hint}</small>}
    </div>
  )
}
