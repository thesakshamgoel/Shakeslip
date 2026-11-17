import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { bouncy, smooth, snappy } from '../lib/motion'
import { BellRing, CheckCheck, Eye, FilePlus2, Mail, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SlipIcon, StudioIcon } from '../brand/icons'
import { useCountUp } from '../lib/countUp'
import { inr } from '../lib/money'

const LINES = [['Cinematography, 2 days', 13000000], ['Highlight film, 4K', 4500000], ['Colour grading', 1500000]] as const
const TOTAL = 22420000 // sample: lines plus 18% GST, in paise
const BEATS = ['Write', 'Send', 'Viewed', 'Paid'] as const
const spring = smooth
const FEED = [
  { icon: FilePlus2, text: 'Invoice drafted' },
  { icon: Mail, text: 'Emailed to Mehta Weddings, and in their Slip inbox' },
  { icon: Eye, text: 'Opened by Aarav Mehta' },
  { icon: CheckCheck, text: 'Payment confirmed, receipt sent' },
]

/* The product, told in four beats: write it, send it, they see it, it is paid.
   Sample business and client names. Reduced motion shows the final beat, still. */
export function HeroScene() {
  const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const [beat, setBeat] = useState(still ? 3 : 0)
  useEffect(() => {
    if (still) return
    const id = setInterval(() => setBeat((b) => (b + 1) % 4), 2600)
    return () => clearInterval(id)
  }, [still])
  const collected = useCountUp(beat === 3 ? TOTAL : 0, 1100)

  const paper = (
    <motion.div layoutId="hero-paper" className="hp" transition={spring}>
      <div className="hp-top"><b>Northlight Films</b><span>INV/2026-27/0042</span></div>
      <div className="hp-to">Bill to <b>Mehta Weddings</b></div>
      {LINES.map(([d, r], i) => (
        <motion.div key={d} className="hp-line" initial={still ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: beat === 0 ? 0.25 + i * 0.28 : 0 }}>
          <span>{d}</span><span className="num">{inr(r)}</span>
        </motion.div>
      ))}
      <div className="hp-total"><span>Total incl. GST</span><b className="num">{inr(TOTAL)}</b></div>
      <AnimatePresence>{beat === 3 && <motion.div className="hp-stamp" initial={{ opacity: 0, scale: 2.2, rotate: -22 }} animate={{ opacity: 1, scale: 1, rotate: -12 }} exit={{ opacity: 0 }} transition={bouncy}>Paid</motion.div>}</AnimatePresence>
    </motion.div>
  )

  return (
    <div className="hs" aria-label="Animated example: an invoice is written in Studio, sent to the client's phone in Slip, viewed, and paid." role="img">
      <LayoutGroup>
        <div className="hs-studio">
          <div className="hs-chrome"><StudioIcon size={22} spinning={beat === 1} /><b>Studio</b><span className="hs-sample">Sample</span></div>
          <div className="hs-stats">
            <div><small>Collected</small><b className="num">{inr(collected)}</b></div>
            <div><small>Status</small>
              <motion.span layout className={`hs-pill hs-${BEATS[beat].toLowerCase()}`} transition={spring}>
                {beat === 0 ? 'Draft' : beat === 1 ? <><Send size={12} />Sent</> : beat === 2 ? <><Eye size={12} />Viewed</> : 'Paid'}
              </motion.span>
            </div>
          </div>
          <div className="hs-slot">
            {beat === 0 ? paper : (
              <ul className="hs-feed">
                <AnimatePresence initial={false}>
                  {FEED.slice(0, beat + 1).reverse().map((f) => (
                    <motion.li key={f.text} layout initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={spring}>
                      <span className="hs-feed-ic"><f.icon size={13} /></span><span>{f.text}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </div>
        <div className="hs-phone">
          <div className="hs-notch" />
          <div className="hs-chrome"><SlipIcon size={22} /><b>Slip</b></div>
          <AnimatePresence>
            {beat === 1 && (
              <motion.div className="hs-banner" initial={{ opacity: 0, y: -30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16 }} transition={snappy}>
                <BellRing size={14} /><span><b>Northlight Films</b> sent you an invoice for {inr(TOTAL)}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="hs-slot hs-slot-phone">{beat > 0 && paper}</div>
        </div>
      </LayoutGroup>
      <ol className="hs-beats" aria-hidden>
        {BEATS.map((b, i) => <li key={b} className={i === beat ? 'on' : ''}>{i === beat && <motion.span layoutId="hs-beat" className="hs-beat" transition={spring} />}<span>{b}</span></li>)}
      </ol>
    </div>
  )
}
