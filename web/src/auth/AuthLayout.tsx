import { motion } from 'motion/react'
import { BellRing, Check, QrCode } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LogoMark } from '../brand/icons'
import { springSoft } from '../lib/motion'
import './auth.css'

/* Faint brand rings drifting behind the form. Pure CSS transform animation; still for reduced motion. */
const RINGS = [
  { s: 520, x: '-12%', y: '-18%', d: 90, o: 0.07 }, { s: 280, x: '78%', y: '8%', d: 70, o: 0.06 },
  { s: 380, x: '62%', y: '70%', d: 110, o: 0.05 }, { s: 180, x: '8%', y: '78%', d: 60, o: 0.08 }, { s: 120, x: '40%', y: '-4%', d: 50, o: 0.06 },
]

/* An honest picture of the product, made of example data and labelled as such. */
function Preview() {
  return (
    <aside className="au-side" aria-label="What Shakeslip does">
      <div className="au-stage" aria-hidden>
        <motion.div className="au-doc" initial={{ opacity: 0, y: 24, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: -2 }} transition={{ ...springSoft, delay: 0.15 }}>
          <div className="au-doc-h"><span className="au-doc-logo" /><span><b>Tax invoice</b><small>INV/2026-27/0001</small></span></div>
          <div className="au-doc-l"><span>Shoot day</span><b>₹25,000</b></div>
          <div className="au-doc-l"><span>Edit and colour</span><b>₹18,000</b></div>
          <div className="au-doc-l"><span>GST 18%</span><b>₹7,740</b></div>
          <div className="au-doc-t"><span>Total</span><b>₹50,740</b></div>
          <span className="au-doc-stamp">Paid</span>
        </motion.div>
        <motion.div className="au-note" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ ...springSoft, delay: 0.45 }}>
          <BellRing size={16} /><span><b>Mehta Weddings opened your invoice</b><small>Slip inbox · just now</small></span>
        </motion.div>
      </div>
      <ul className="au-points">
        <li><Check size={16} aria-hidden />Your client gets a copy in their own Slip inbox</li>
        <li><BellRing size={16} aria-hidden />Reminders go out on their own until it is paid</li>
        <li><QrCode size={16} aria-hidden />A UPI QR with the exact amount on every invoice</li>
      </ul>
      <small className="au-example">Example invoice for illustration.</small>
    </aside>
  )
}

export function AuthLayout({ title, lead, children, foot }: { title: string; lead?: string; children: ReactNode; foot?: ReactNode }) {
  return (
    <main className="au">
      <div className="au-bg" aria-hidden>
        {RINGS.map((r, i) => <span key={i} className="au-ring" style={{ width: r.s, height: r.s, left: r.x, top: r.y, opacity: r.o, animationDuration: `${r.d}s, ${r.d / 3}s` }} />)}
      </div>
      <div className="au-split">
        <motion.div className="au-in" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}>
          <Link to="/" className="au-brand" aria-label="Shakeslip home"><LogoMark size={52} /><span>Shakeslip</span></Link>
          <h1>{title}</h1>
          {lead && <p className="au-lead">{lead}</p>}
          {children}
          {foot && <p className="au-foot">{foot}</p>}
        </motion.div>
        <Preview />
      </div>
    </main>
  )
}
