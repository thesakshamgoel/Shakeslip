import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { smooth, snappy } from '../lib/motion'
import { BellRing, CircleCheck, Eye, Send, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoginPanel } from '../auth/Login'
import { PREVIEW_TEXT, PREVIEW_TITLE, STATIC_PREVIEW } from '../lib/staticPreview'
import './hero.css'

const rise = smooth

/* Each word slides up from behind its own line, one after another. */
function Words({ text, start = 0, className }: { text: string; start?: number; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <span className={className}>
      {text.split(' ').map((w, i) => (
        <span key={i}>{i > 0 && ' '}<span className="hx-wmask">
          <motion.span className="hx-w" initial={reduce ? { opacity: 0 } : { y: '110%' }} animate={reduce ? { opacity: 1 } : { y: '0%' }} transition={{ ...rise, delay: start + i * 0.055 }}>{w}</motion.span>
        </span></span>
      ))}
    </span>
  )
}

/* One invoice's life, told in a line that keeps moving: sent, opened, reminded, paid. Example data. */
const STORY: { icon: LucideIcon; text: string; tone: string }[] = [
  { icon: Send, text: 'INV/0042 sent to Mehta Weddings', tone: 'info' },
  { icon: Eye, text: 'Opened by Aarav, just now', tone: 'info' },
  { icon: BellRing, text: 'Reminder sent on the due date', tone: 'warn' },
  { icon: CircleCheck, text: 'Paid ₹2,24,200. Receipt sent.', tone: 'ok' },
]
function Story() {
  const [i, setI] = useState(0)
  useEffect(() => { const id = setInterval(() => setI((n) => (n + 1) % STORY.length), 2600); return () => clearInterval(id) }, [])
  const s = STORY[i]
  return (
    <div className="hx-story" aria-live="off">
      <span className="hx-story-dot" aria-hidden />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={i} className={`hx-story-t ${s.tone}`} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }} transition={snappy}>
          <s.icon size={16} aria-hidden />{s.text}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

export function Hero({ first }: { first: boolean }) {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  /* leaving the hero: the copy eases up and fades, the card follows a little slower */
  const copyY = useTransform(scrollY, [0, 500], [0, -70]), copyO = useTransform(scrollY, [0, 420], [1, 0.15])
  const cardY = useTransform(scrollY, [0, 500], [0, -30])
  /* the rings lean toward the pointer */
  const px = useMotionValue(0), py = useMotionValue(0)
  const rx = useSpring(useTransform(px, [-1, 1], [-8, 8]), { stiffness: 50, damping: 20 })
  const ry = useSpring(useTransform(py, [-1, 1], [-6, 6]), { stiffness: 50, damping: 20 })
  const rx2 = useTransform(rx, (v) => v * -0.6), ry2 = useTransform(ry, (v) => v * -0.6)
  return (
    <section className="lp-hero hx" onPointerMove={(e) => { if (e.pointerType !== 'mouse' || reduce) return; px.set((e.clientX / innerWidth) * 2 - 1); py.set((e.clientY / innerHeight) * 2 - 1) }}>
      <div className="hx-stage" aria-hidden>
        <motion.span className="hx-ring r1" style={{ x: rx, y: ry }} initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }} />
        <motion.span className="hx-ring r2" style={{ x: rx2, y: ry2 }} initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ duration: 1.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} />
      </div>

      <motion.div className="lp-hero-copy" style={reduce ? undefined : { y: copyY, opacity: copyO }}>
        <motion.p className="lp-eyebrow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...rise, delay: 0.05 }}>For Indian freelancers, studios and the people who pay them</motion.p>
        <h1><Words text="Send the invoice." start={0.12} /><br /><Words text="Shakeslip does the rest." start={0.36} className="hx-em" /></h1>
        <motion.p className="lp-lead" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...rise, delay: 0.75 }}>Make a GST-ready invoice in about a minute. Your client gets it by email and in their own inbox, you both see every step, and reminders go out until it is paid.</motion.p>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...rise, delay: 0.9 }}><Story /></motion.div>
        <motion.ul className="lp-ticks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.05 }}><li>GST-ready</li><li>Works on any phone</li><li>Private by design</li></motion.ul>
      </motion.div>

      <motion.div className="hx-card-wrap" style={reduce ? undefined : { y: cardY }}>
        <motion.aside className="lp-login" initial={{ opacity: 0, y: 28, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...rise, delay: 0.3 }} aria-label={STATIC_PREVIEW ? PREVIEW_TITLE : 'Sign in'}>
          {STATIC_PREVIEW ? <>
            <h2>{PREVIEW_TITLE}</h2>
            <p className="lp-login-lead">{PREVIEW_TEXT}</p>
            <p className="lp-login-new"><Link to="/faq">Read the FAQ</Link></p>
          </> : <>
          <h2>{first ? 'Welcome to Shakeslip' : 'Welcome back'}</h2>
          <p className="lp-login-lead">{first ? 'Sign in if you have an account. New here? It takes under a minute to create one, and it is free.' : 'Sign in to pick up where you left off.'}</p>
          <LoginPanel next={null} />
          <p className="lp-login-new">New to Shakeslip? <Link to="/signup">Create a free account</Link></p>
          </>}
        </motion.aside>
      </motion.div>
    </section>
  )
}
