import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react'
import { ArrowRight, BadgeCheck, BellRing, Calculator, FileSignature, Hash, History, Inbox, Languages, Link2, Lock, QrCode, ScrollText, Sparkles, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { LogoMark, SlipIcon, StudioIcon } from '../brand/icons'
import { Button } from '../components/Button'
import { reveal, spring } from '../lib/motion'
import { useSession } from '../lib/session'
import { Hero } from './Hero'
import { HeroScene } from './HeroScene'
import { DesignShowcase, Marquee, PasteDemo } from './Showcase'
import './landing.css'

const STEPS: { n: string; title: string; body: string; icon: LucideIcon }[] = [
  { n: '01', title: 'Design your invoice once', body: 'Pick a design and an invoice type, or build your own with the fields, columns, tax and terms your work needs.', icon: Sparkles },
  { n: '02', title: 'Connect your client', body: 'Send an invite by email or WhatsApp, or let them scan your QR. They get a free Slip inbox for everything you send.', icon: Link2 },
  { n: '03', title: 'Send it, then stop chasing', body: 'They get it by email and in Slip. You both see when it is opened and paid. Reminders go out on the schedule you set.', icon: BellRing },
]

const SMART: { title: string; body: string; icon: LucideIcon }[] = [
  { title: 'The right tax, every time', body: 'Different states get IGST, same state gets CGST and SGST. Worked out from the GSTINs, automatically.', icon: Calculator },
  { title: 'GSTIN typo catcher', body: 'Every GSTIN is checked against its check digit before it lands on an invoice.', icon: BadgeCheck },
  { title: 'Scan to pay', body: 'Add your UPI ID and every invoice carries a QR with the exact amount. On a phone, one tap opens their UPI app.', icon: QrCode },
  { title: 'Terms that write themselves', body: 'Pick clauses or tap Suggest. Names, amounts and due dates fill in, on their own page.', icon: ScrollText },
  { title: 'Remembers your rates', body: 'Start typing a line and it offers what you billed before, with the rate you used last.', icon: History },
  { title: 'Numbering without gaps', body: 'Numbers are given at the moment you send, per series and financial year, so GST records stay clean.', icon: Hash },
  { title: 'Amount in words', body: 'Written the Indian way, in lakhs and crores, on every invoice.', icon: Languages },
  { title: 'Signed and sealed', body: 'Add a typed or uploaded signature once. Sent invoices are frozen exactly as sent.', icon: FileSignature },
]

export default function Landing() {
  /* first visit: a welcome; after that, a welcome back */
  const [first] = useState(() => { try { const f = !localStorage.getItem('ss-visited'); localStorage.setItem('ss-visited', '1'); return f } catch { return true } })
  const { me, ready } = useSession()
  const { scrollY } = useScroll()
  const navShadow = useTransform(scrollY, [0, 40], [0, 1])
  /* the hero scene has depth: it tilts toward the pointer and drifts as you scroll */
  const mx = useMotionValue(0), my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-1, 1], [5, -5]), { stiffness: 120, damping: 18 })
  const ry = useSpring(useTransform(mx, [-1, 1], [-7, 7]), { stiffness: 120, damping: 18 })
  if (ready && me?.user) return <Navigate to="/home" replace />

  return (
    <div className="lp">
      <motion.header className="lp-nav" style={{ ['--nav-line' as string]: navShadow }}>
        <Link to="/" className="lp-brand" aria-label="Shakeslip home"><LogoMark size={42} className="lp-logo" /><span>Shakeslip</span></Link>
        <nav aria-label="Sections" className="lp-links"><a href="#how">How it works</a><a href="#smart">Features</a><a href="#designs">Designs</a></nav>
        <div className="lp-nav-cta"><Link to="/login" className="lp-signin">Sign in</Link><Link to="/signup"><Button variant="primary">Get started</Button></Link></div>
      </motion.header>

      <main>
        <Hero first={first} />

        <section className="lp-sec lp-see" aria-label="The product">
          <motion.div className="lp-hero-scene" initial={{ opacity: 0, y: 60, scale: 0.94 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.25 }} transition={spring}
            onPointerMove={(e) => { if (e.pointerType !== 'mouse') return; const r = e.currentTarget.getBoundingClientRect(); mx.set(((e.clientX - r.left) / r.width) * 2 - 1); my.set(((e.clientY - r.top) / r.height) * 2 - 1) }}
            onPointerLeave={() => { mx.set(0); my.set(0) }}>
            <motion.div style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}><HeroScene /></motion.div>
          </motion.div>
        </section>

        <Marquee />

        <section className="lp-sec lp-sides">
          <motion.h2 {...reveal}>Two sides of every invoice, finally in the same place</motion.h2>
          <div className="lp-two">
            <motion.article className="lp-side" {...reveal}>
              <StudioIcon size={56} />
              <h3>Studio, for the one who sends</h3>
              <ul><li>Design your own invoice types and terms</li><li>Group clients and give each group its own look, due dates and reminders</li><li>See who opened, who paid, and what is due this week</li></ul>
            </motion.article>
            <motion.article className="lp-side" {...reveal} transition={{ ...reveal.transition, delay: 0.08 }}>
              <SlipIcon size={56} />
              <h3>Slip, for the one who pays</h3>
              <ul><li>Every invoice from every business, in one inbox</li><li>Pay by UPI in one tap, then tell them it is done</li><li>Keep your billing details correct for everyone, once</li></ul>
            </motion.article>
          </div>
        </section>

        <section className="lp-sec" id="how">
          <motion.h2 {...reveal}>How it works</motion.h2>
          <ol className="lp-steps">
            {STEPS.map((s, i) => (
              <motion.li key={s.n} className="lp-step" {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }}>
                <span className="lp-step-n num">{s.n}</span><s.icon size={22} aria-hidden className="lp-step-ic" /><h3>{s.title}</h3><p>{s.body}</p>
              </motion.li>
            ))}
          </ol>
        </section>

        <section className="lp-sec" id="smart">
          <motion.h2 {...reveal}>Smart where it saves you time</motion.h2>
          <motion.p className="lp-sub" {...reveal}>The fiddly parts of Indian invoicing, handled for you.</motion.p>
          <div className="lp-grid">
            {SMART.map((f, i) => (
              <motion.article key={f.title} className="lp-card" {...reveal} transition={{ ...reveal.transition, delay: (i % 4) * 0.06 }} whileHover={{ y: -4 }}>
                <span className="lp-card-ic"><f.icon size={20} aria-hidden /></span><h3>{f.title}</h3><p>{f.body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="lp-sec lp-paste">
          <div><motion.h2 {...reveal}>Paste their details. We fill in the rest.</motion.h2>
            <motion.p className="lp-sub" {...reveal}>Drop in an email signature or a WhatsApp message. Shakeslip picks out the name, company, email, phone, GSTIN, state and PIN, and checks the GSTIN as it goes.</motion.p></div>
          <motion.div {...reveal}><PasteDemo /></motion.div>
        </section>

        <section className="lp-sec" id="designs">
          <motion.h2 {...reveal}>One invoice, nine designs.</motion.h2>
          <motion.p className="lp-sub" {...reveal}>Switch any time. Your numbers, terms and details stay exactly where they are. Shown with a sample invoice.</motion.p>
          <motion.div {...reveal}><DesignShowcase /></motion.div>
        </section>

        <section className="lp-sec lp-privacy">
          <motion.div className="lp-priv" {...reveal}>
            <Lock size={28} aria-hidden />
            <div><h2>Your invoices are yours</h2><p>A business only sees its own clients. A client only sees invoices sent to them. Nothing is shared with anyone else, and nothing is used to train AI.</p></div>
          </motion.div>
        </section>

        <section className="lp-final">
          <motion.div {...reveal}>
            <LogoMark size={64} className="lp-final-logo" />
            <h2>Your next invoice could be the last one you chase.</h2>
            <div className="lp-cta lp-cta-c"><Link to="/signup"><Button variant="primary" className="lp-big">Create your Studio <ArrowRight size={18} aria-hidden /></Button></Link><Link to="/login"><Button className="lp-big"><Inbox size={18} aria-hidden />Open my Slip</Button></Link></div>
          </motion.div>
        </section>
      </main>

      <footer className="lp-foot">
        <span className="lp-brand"><LogoMark size={22} /><span>Shakeslip</span></span>
        <nav aria-label="Legal"><Link to="/faq">FAQ</Link><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><Link to="/cookies">Cookies</Link><Link to="/licence">Licence</Link></nav>
        <span>Made in India</span>
      </footer>
    </div>
  )
}

