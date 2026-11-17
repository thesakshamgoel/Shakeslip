import { animate, motion, useReducedMotion } from 'motion/react'
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { greeting } from '../lib/welcome'
import './welcome.css'

/* True while the big greeting is on screen. The page heading is laid out but hidden, so the greeting can land exactly on it. */
export const WelcomeCtx = createContext(false)

/* The page heading. While the welcome plays it keeps its place invisibly; afterwards it is simply there, no animation of its own. */
export function GreetHeading({ name }: { name: string }) {
  const waiting = useContext(WelcomeCtx)
  return <h1 className="greet-h" data-greet-target style={waiting ? { visibility: 'hidden' } : undefined}>{greeting()}, <span className="greet-name">{name}</span></h1>
}


/* The loader's star must open first; without a loader (signing in inside the app) the greeting starts at once. */
function useAfterSplash(): boolean {
  const [ready, setReady] = useState(() => { const s = document.getElementById('splash'); return !s || s.classList.contains('out') })
  useEffect(() => {
    if (ready) return
    /* the star is mostly open about two thirds of a second after it starts; writing begins there, not behind the loader */
    const go = () => setTimeout(() => setReady(true), 380)
    addEventListener('ss-splash-open', go, { once: true })
    const t = setTimeout(() => setReady(true), 6000) // never wait forever
    return () => { removeEventListener('ss-splash-open', go); clearTimeout(t) }
  }, [ready])
  return ready
}

/* Where the real heading sits on the page, and how big the greeting may be drawn in the middle of the screen. */
function place(name = '') {
  let t = document.querySelector<HTMLElement>('[data-greet-target]')
  let virtual = false, probe: HTMLElement | null = null
  if (!t) {
    /* pages without the big heading (Updates, Settings, ...): measure where one would sit at the top of the page content */
    const page = document.querySelector<HTMLElement>('.main .page, .slide-page, main') ?? document.body
    const pr = page.getBoundingClientRect(), pc = getComputedStyle(page)
    probe = document.createElement('h1'); probe.className = 'greet-h'; probe.textContent = `${greeting()}, ${name}`
    probe.style.cssText = `position:fixed;visibility:hidden;white-space:nowrap;margin:0;left:${pr.left + (parseFloat(pc.paddingLeft) || 24)}px;top:${pr.top + (parseFloat(pc.paddingTop) || 24)}px`
    document.body.appendChild(probe); t = probe; virtual = true
  }
  const r = t.getBoundingClientRect()
  const S = Math.max(1, Math.min(1.9, (innerWidth - 40) / Math.max(1, r.width)))
  const x = innerWidth / 2 - r.left - (r.width * S) / 2, y = innerHeight * 0.44 - r.top - (r.height * S) / 2
  /* the same type as the real heading, wherever it sits on the page */
  const c = getComputedStyle(t)
  const type = { fontFamily: c.fontFamily, fontSize: c.fontSize, fontWeight: c.fontWeight, letterSpacing: c.letterSpacing, lineHeight: c.lineHeight, color: c.color }
  const oneLine = r.height < parseFloat(c.lineHeight || '0') * 1.5 || c.lineHeight === 'normal' && r.height < parseFloat(c.fontSize) * 1.8
  probe?.remove()
  return { r, S, x, y, type, oneLine, virtual }
}

type Letter = { ch: string; x: number; y: number; h: number; name: boolean; nx: number; ny: number; nw: number; nh: number }

/* Where every letter of the real heading text sits (in the heading's own unscaled coordinates), so each letter can be
   animated in at exactly its place: the font's kerning and spacing stay untouched. */
function measure(h: HTMLElement): Letter[] {
  const box = h.getBoundingClientRect(), plain = h.querySelector('.greet-plain')
  /* the true on-screen scale (our own zoom times any zoom the page is in the middle of, e.g. the loader's) */
  const S = box.width / Math.max(1, h.offsetWidth)
  const nameEl = h.querySelector<HTMLElement>('.greet-plain .greet-name'), nb = nameEl?.getBoundingClientRect()
  if (!plain) return []
  const out: Letter[] = [], range = document.createRange(), walk = document.createTreeWalker(plain, NodeFilter.SHOW_TEXT)
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const text = n.textContent ?? '', inName = !!nameEl?.contains(n)
    for (let i = 0; i < text.length; i++) {
      if (!text[i].trim()) continue
      range.setStart(n, i); range.setEnd(n, i + 1)
      const r = range.getBoundingClientRect()
      out.push({ ch: text[i], x: (r.left - box.left) / S, y: (r.top - box.top) / S, h: r.height / S, name: inName,
        nx: nb ? (r.left - nb.left) / S : 0, ny: nb ? (r.top - nb.top) / S : 0, nw: nb ? nb.width / S : 0, nh: nb ? nb.height / S : 0 })
    }
  }
  return out
}

const STEP = 0.03 // seconds between letters
const LETTER = 0.32 // seconds each letter takes to arrive
const REST = 420 // ms the finished greeting rests before it rises
const REST_ALONE = 800 // longer when there is no heading to land on, so it can be read
const RISE = { type: 'spring', visualDuration: 0.4, bounce: 0 } as const

/* The greeting is the page heading itself, drawn large on a clear screen: written on letter by letter, a short rest,
   then it rises onto the real heading while the screen stays clear, and only then does the page appear around it. */
export function WelcomeOverlay({ name, onReveal, onDone }: { name: string; onReveal: () => void; onDone: () => void }) {
  const reduced = useReducedMotion()
  const ready = useAfterSplash()
  const [pos, setPos] = useState<ReturnType<typeof place> | null>(null)
  const nameRef = useRef(name); nameRef.current = name
  const [letters, setLetters] = useState<Letter[] | null>(null)
  const [plain, setPlain] = useState(false)
  const head = useRef<HTMLHeadingElement>(null), back = useRef<HTMLDivElement>(null)

  /* whatever happens, the greeting never holds the screen for more than a few seconds */
  useEffect(() => { const t = setTimeout(() => { onReveal(); onDone() }, 7500); return () => clearTimeout(t) }, [onReveal, onDone])
  /* measure once the page behind has settled */
  useEffect(() => { if (ready) { const id = requestAnimationFrame(() => setPos(place(nameRef.current))); return () => cancelAnimationFrame(id) } }, [ready])
  useLayoutEffect(() => { if (pos && head.current && !letters) setLetters(reduced ? [] : measure(head.current)) }, [pos, letters, reduced])

  useEffect(() => {
    if (!pos || !letters) return
    let stop = false
    const written = reduced || !letters.length ? 0 : (letters.length * STEP + 0.22) * 1000
    const timers = [setTimeout(() => setPlain(true), written)]
    timers.push(setTimeout(async () => {
      const h = head.current, b = back.current
      if (!h || !b || stop) return
      if (!reduced) {
        const now = pos.virtual ? pos : place(nameRef.current) // the page may have moved a pixel or two; land on where it is now
        h.style.left = `${now.r.left}px`; h.style.top = `${now.r.top}px`
        if (pos.virtual) {
          /* no heading on this page: it rises toward where one would be and fades away with the backdrop */
          onReveal()
          await Promise.all([animate(h, { x: 0, y: -8, scale: 1 }, RISE), animate(h, { opacity: 0 }, { duration: 0.34, delay: 0.16 }), animate(b, { opacity: 0 }, { duration: 0.42, delay: 0.1, ease: [0.22, 1, 0.36, 1] })])
          if (!stop) onDone()
          return
        }
        await animate(h, { x: 0, y: 0, scale: 1 }, RISE)
      }
      if (stop) return
      onReveal() // the real heading is now exactly underneath
      await animate(b, { opacity: 0 }, { duration: reduced ? 0.2 : 0.32, ease: [0.22, 1, 0.36, 1] })
      if (!stop) onDone()
    }, written + (reduced ? 400 : pos.virtual ? REST_ALONE : REST)))
    return () => { stop = true; timers.forEach(clearTimeout) }
  }, [pos, letters, reduced, onReveal, onDone])

  return (
    <div className="welcome" aria-hidden>
      <div className="welcome-back" ref={back} />
      {pos && (
        <motion.h1 ref={head} className={`greet-h greet-fly ${pos.oneLine ? 'one-line' : ''}`} style={{ ...pos.type, left: pos.r.left, top: pos.r.top, width: pos.r.width + 2, originX: 0, originY: 0 }}
          initial={{ x: pos.x, y: pos.y, scale: pos.S }}>
          {/* the real text: laid out from the start (for measuring), shown the moment the last letter lands, pixel for pixel the same */}
          <span className="greet-plain" style={{ opacity: plain ? 1 : 0 }}>{greeting()}, <span className="greet-name" style={plain ? undefined : { animation: 'none' }}>{name}</span></span>
          {!plain && letters && letters.map((l, i) => (
            <motion.span key={i} className={`greet-letter ${l.name ? 'greet-name greet-name-ch' : ''}`}
              style={{ left: l.x, top: l.y, height: l.h, lineHeight: `${l.h}px`, ...(l.name ? { backgroundSize: `${l.nw * 2}px ${l.nh}px`, backgroundPosition: `${-l.nx}px ${-l.ny}px` } : {}) }}
              initial={{ opacity: 0, y: '0.35em' }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', visualDuration: LETTER, bounce: 0, delay: i * STEP, opacity: { duration: 0.16, delay: i * STEP } }}>{l.ch}</motion.span>
          ))}
        </motion.h1>
      )}
    </div>
  )
}
