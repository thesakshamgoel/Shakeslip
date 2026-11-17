import { animate, motion, useReducedMotion } from 'motion/react'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { glide } from '../lib/motion'
import { greeting } from '../lib/welcome'
import './welcome.css'

/* True while the big greeting is on screen. The page heading is laid out but hidden, so the greeting can land exactly on it. */
export const WelcomeCtx = createContext(false)

/* The page heading. While the welcome plays it keeps its place invisibly; afterwards it is simply there, no animation of its own. */
export function GreetHeading({ name }: { name: string }) {
  const waiting = useContext(WelcomeCtx)
  return <h1 className="greet-h" data-greet-target style={waiting ? { visibility: 'hidden' } : undefined}>{greeting()}, <span className="greet-name">{name}</span></h1>
}

const WRITE = 0.95 // seconds the greeting takes to be written on
const HOLD = 600 // ms the finished greeting rests before it rises

/* The loader's star must open first; without a loader (signing in inside the app) the greeting starts at once. */
function useAfterSplash(): boolean {
  const [ready, setReady] = useState(() => { const s = document.getElementById('splash'); return !s || s.classList.contains('out') })
  useEffect(() => {
    if (ready) return
    const go = () => setTimeout(() => setReady(true), 280)
    addEventListener('ss-splash-open', go, { once: true })
    const t = setTimeout(() => setReady(true), 6000) // never wait forever
    return () => { removeEventListener('ss-splash-open', go); clearTimeout(t) }
  }, [ready])
  return ready
}

/* Where the real heading sits on the page, and how big the greeting may be drawn in the middle of the screen. */
function place() {
  const t = document.querySelector<HTMLElement>('[data-greet-target]')
  if (!t) return null
  const r = t.getBoundingClientRect()
  const S = Math.max(1, Math.min(1.9, (innerWidth - 40) / Math.max(1, r.width)))
  const x = innerWidth / 2 - r.left - (r.width * S) / 2, y = innerHeight * 0.44 - r.top - (r.height * S) / 2
  /* the same type as the real heading, wherever it sits on the page */
  const c = getComputedStyle(t)
  const type = { fontFamily: c.fontFamily, fontSize: c.fontSize, fontWeight: c.fontWeight, letterSpacing: c.letterSpacing, lineHeight: c.lineHeight, color: c.color }
  const oneLine = r.height < parseFloat(c.lineHeight || '0') * 1.5 || c.lineHeight === 'normal' && r.height < parseFloat(c.fontSize) * 1.8
  return { r, S, x, y, type, oneLine }
}

/* The greeting is the page heading itself, drawn large on a clear screen: written on letter by letter, it rests,
   glides up onto the real heading while the screen stays clear, and only then does the page appear around it. */
export function WelcomeOverlay({ name, onReveal, onDone }: { name: string; onReveal: () => void; onDone: () => void }) {
  const reduced = useReducedMotion()
  const ready = useAfterSplash()
  const [pos, setPos] = useState<ReturnType<typeof place>>(null)
  const head = useRef<HTMLHeadingElement>(null), back = useRef<HTMLDivElement>(null)

  /* measure once the page behind has settled */
  useEffect(() => { if (ready) { const id = requestAnimationFrame(() => setPos(place())); return () => cancelAnimationFrame(id) } }, [ready])

  useEffect(() => {
    if (!pos) return
    let stop = false
    const written = reduced ? 300 : WRITE * 1000 + 250
    const t = setTimeout(async () => {
      const h = head.current, b = back.current
      if (!h || !b || stop) return
      if (!reduced) {
        const now = place() ?? pos // the page may have moved a pixel or two; land on where it is now
        h.style.left = `${now.r.left}px`; h.style.top = `${now.r.top}px`
        await animate(h, { x: 0, y: 0, scale: 1 }, glide)
      }
      if (stop) return
      onReveal() // the real heading is now exactly underneath
      await animate(b, { opacity: 0 }, { duration: reduced ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] })
      if (!stop) onDone()
    }, written + HOLD)
    return () => { stop = true; clearTimeout(t) }
  }, [pos, reduced, onReveal, onDone])

  /* written on with a reveal that sweeps left to right over one ordinary line of text: the same letters, spacing and
     wrapping as the real heading, so when it lands nothing shifts by even a pixel */
  return (
    <div className="welcome" aria-hidden>
      <div className="welcome-back" ref={back} />
      {pos && (
        <motion.h1 ref={head} className={`greet-h greet-fly ${pos.oneLine ? 'one-line' : ''}`} style={{ ...pos.type, left: pos.r.left, top: pos.r.top, width: pos.r.width + 2, originX: 0, originY: 0 }}
          initial={{ x: pos.x, y: pos.y, scale: pos.S }}>
          <motion.span className="greet-ink" initial={reduced ? { opacity: 0 } : { clipPath: 'inset(-30% 100% -30% 0)', opacity: 0.4 }} animate={{ clipPath: 'inset(-30% 0% -30% 0)', opacity: 1 }}
            transition={{ clipPath: { duration: WRITE, ease: [0.45, 0.05, 0.25, 1] }, opacity: { duration: WRITE * 0.5 } }}>
            {greeting()}, <span className="greet-name">{name}</span>
          </motion.span>
        </motion.h1>
      )}
    </div>
  )
}
