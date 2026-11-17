import { AnimatePresence, motion } from 'motion/react'
import { snappy } from '../lib/motion'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { usePlacement } from '../lib/placement'
import './select.css'

const WD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MF = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const DF = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const ymd = (d: Date) => d.toISOString().slice(0, 10)
const todayYmd = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

/* Our own calendar: a month grid with Today, arrow-key navigation and min date. Value is YYYY-MM-DD. */
export function DatePicker({ label, value, onChange, min, name, hint, error, today = true }: {
  label?: string; value: string; onChange: (v: string) => void; min?: string; name?: string; hint?: string; error?: string; today?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => new Date(`${(value || todayYmd()).slice(0, 7)}-01T00:00:00Z`))
  const [dir, setDir] = useState(1)
  const id = useId()
  const box = useRef<HTMLDivElement>(null)
  const pos = usePlacement(open, box, 400, 300)
  useEffect(() => { if (open) setView(new Date(`${(value || todayYmd()).slice(0, 7)}-01T00:00:00Z`)) }, [open, value])
  useEffect(() => {
    if (!open) return
    const out = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', out)
    return () => document.removeEventListener('pointerdown', out)
  }, [open])
  const first = view.getUTCDay() === 0 ? 6 : view.getUTCDay() - 1
  const days = new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth() + 1, 0)).getUTCDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth(), i + 1)))]
  const move = (k: number) => { setDir(k); setView(new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth() + k, 1))) }
  const pick = (v: string) => { onChange(v); setOpen(false) }
  function key(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false)
    if (!open || !value) return
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (step) { e.preventDefault(); const d = new Date(`${value}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + step); const v = ymd(d); if (!min || v >= min) { onChange(v); setView(new Date(`${v.slice(0, 7)}-01T00:00:00Z`)) } }
    if (e.key === 'Enter') { e.preventDefault(); setOpen(false) }
  }
  const t = todayYmd()
  return (
    <div className={`field sel ${error ? 'has-error' : ''}`} ref={box} onKeyDown={key}>
      {label && <span id={`${id}-l`}>{label}</span>}
      {name && <input type="hidden" name={name} value={value} />}
      <button type="button" className="input sel-btn" aria-haspopup="dialog" aria-expanded={open} aria-labelledby={label ? `${id}-l` : undefined} onClick={() => setOpen((o) => !o)}>
        <span className={value ? 'num' : 'sel-ph'}>{value ? DF.format(new Date(`${value}T00:00:00Z`)) : 'Pick a date'}</span>
        <CalendarDays size={18} aria-hidden className="sel-chev" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className={`sel-pop cal ${pos.up ? 'sel-up' : ''} ${pos.end ? 'sel-end' : ''}`} role="dialog" aria-label="Choose a date" style={{ maxHeight: pos.maxH }} initial={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: pos.up ? 4 : -4, scale: 0.98 }} transition={snappy}>
            <div className="cal-h">
              <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => move(-1)}><ChevronLeft size={18} /></button>
              <b>{MF.format(view)}</b>
              <button type="button" className="icon-btn" aria-label="Next month" onClick={() => move(1)}><ChevronRight size={18} /></button>
            </div>
            <div className="cal-g cal-wd" aria-hidden>{WD.map((w) => <span key={w}>{w}</span>)}</div>
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div key={ymd(view)} className="cal-g" custom={dir} initial={{ opacity: 0, x: 24 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 * dir }} transition={snappy}>
                {cells.map((d, i) => {
                  if (!d) return <span key={`e${i}`} />
                  const v = ymd(d), off = !!min && v < min
                  return <button key={v} type="button" disabled={off} className={`cal-d ${v === value ? 'on' : ''} ${v === t ? 'today' : ''}`} aria-pressed={v === value} onClick={() => pick(v)}>{d.getUTCDate()}</button>
                })}
              </motion.div>
            </AnimatePresence>
            {today && <div className="cal-f"><button type="button" className="btn btn-ghost" disabled={!!min && t < min} onClick={() => pick(t)}>Today</button>{value && <button type="button" className="btn btn-ghost" onClick={() => pick('')}>Clear</button>}</div>}
          </motion.div>
        )}
      </AnimatePresence>
      {error ? <small className="field-err">{error}</small> : hint && <small className="hint">{hint}</small>}
    </div>
  )
}
