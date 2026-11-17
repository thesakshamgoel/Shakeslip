import { AnimatePresence, motion } from 'motion/react'
import { smooth, snappy } from '../lib/motion'
import { useEffect, useRef, useState } from 'react'
import { InvoiceDocument } from '../components/InvoiceDocument'
import { invoiceThemes } from '../themes/invoice'
import { sampleDoc } from './sample'

const spring = snappy

/* One sample invoice, every design. It cycles on its own while visible; tap a design to hold it. */
export function DesignShowcase() {
  const [i, setI] = useState(0)
  const [held, setHeld] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.3 })
    if (box.current) io.observe(box.current)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (held || !seen || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setI((x) => (x + 1) % invoiceThemes.length), 2400)
    return () => clearInterval(id)
  }, [held, seen])
  const t = invoiceThemes[i]
  return (
    <div className="sc" ref={box}>
      <div className="sc-list" role="radiogroup" aria-label="Invoice designs">
        {invoiceThemes.map((x, k) => (
          <button key={x.id} role="radio" aria-checked={k === i} className="sc-item tap" onClick={() => { setI(k); setHeld(true) }}>
            {k === i && <motion.span layoutId="sc-pill" className="sc-pill" transition={spring} />}
            <span className="sc-sw" style={{ background: x.swatch[0] }}><i style={{ background: x.swatch[1] }} /><i style={{ background: x.swatch[2] }} /></span>
            <span className="sc-txt"><b>{x.name}</b><small>{x.blurb}</small></span>
          </button>
        ))}
      </div>
      <div className="sc-stage">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={t.id} className="sc-doc" initial={{ opacity: 0, y: 24, rotate: -1.2, scale: 0.97 }} animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }} exit={{ opacity: 0, y: -16, rotate: 1, scale: 0.98 }} transition={smooth}>
            <InvoiceDocument d={sampleDoc(t.id)} only={0} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

const PASTE = 'Aarav Mehta\nMehta Weddings\naarav@mehta.example\n+91 98765 43210\nGSTIN 27AAPFU0939F1ZV\nMumbai 400050'
const FIELDS = [['Contact', 'Aarav Mehta'], ['Company', 'Mehta Weddings'], ['Email', 'aarav@mehta.example'], ['WhatsApp', '+91 98765 43210'], ['GSTIN', '27AAPFU0939F1ZV ✓'], ['State', 'Maharashtra'], ['PIN', '400050']] as const

/* Smart paste, shown working: a pasted message turns into a filled form. Sample details. */
export function PasteDemo() {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(PASTE.length + FIELDS.length * 6); return }
    const id = setInterval(() => setN((x) => (x > PASTE.length + FIELDS.length * 6 + 40 ? 0 : x + 1)), 45)
    return () => clearInterval(id)
  }, [])
  const typed = PASTE.slice(0, n)
  const filled = Math.max(0, Math.floor((n - PASTE.length) / 6))
  return (
    <div className="pd" aria-label="Example: pasting a contact block fills the client form" role="img">
      <div className="pd-paste"><small>Pasted</small><pre>{typed}<span className="pd-caret" /></pre></div>
      <div className="pd-form">
        {FIELDS.map(([k, v], i) => (
          <div key={k} className="pd-f">
            <small>{k}</small>
            <AnimatePresence>{i < filled && <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={snappy}>{v}</motion.span>}</AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}

const WHO = ['Filmmakers', 'Photographers', 'Designers', 'Developers', 'Consultants', 'Wedding planners', 'Musicians', 'Architects', 'Studios', 'Agencies', 'Editors', 'Tutors']
/* A constant-speed strip (the one place linear motion belongs). Pauses on hover. */
export function Marquee() {
  return (
    <div className="mq" aria-label={`Built for ${WHO.join(', ')}`}>
      <div className="mq-track" aria-hidden>{[...WHO, ...WHO].map((w, i) => <span key={i}>{w}</span>)}</div>
    </div>
  )
}
