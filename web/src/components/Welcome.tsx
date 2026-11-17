import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { createContext, Fragment, useContext, useEffect, useState } from 'react'
import { glide, smooth } from '../lib/motion'
import { greeting } from '../lib/welcome'
import './welcome.css'

/* True while the big greeting is on screen. The page heading waits, so the greeting holds in the middle first. */
export const WelcomeCtx = createContext(false)

/* The page heading. On a welcome it is the same element as the big centred greeting, so it glides up into place. */
export function GreetHeading({ name }: { name: string }) {
  const waiting = useContext(WelcomeCtx)
  if (waiting) return <h1 className="greet-h" style={{ visibility: 'hidden' }}>{greeting()}, <span className="greet-name">{name}</span></h1>
  return <motion.h1 layoutId="greet" className="greet-h" transition={glide}>{greeting()}, <span className="greet-name">{name}</span></motion.h1>
}

const STEP = 0.032 // seconds between letters while the greeting is written on
const HOLD = 650 // ms the finished greeting rests before it rises

/* The loader's star must open first; when there is no loader (signing in inside the app) the greeting starts at once. */
function useAfterSplash(): boolean {
  const [ready, setReady] = useState(() => { const s = document.getElementById('splash'); return !s || s.classList.contains('out') })
  useEffect(() => {
    if (ready) return
    const go = () => setTimeout(() => setReady(true), 280)
    addEventListener('ss-splash-open', go, { once: true })
    /* safety: never wait forever */
    const t = setTimeout(() => setReady(true), 6000)
    return () => { removeEventListener('ss-splash-open', go); clearTimeout(t) }
  }, [ready])
  return ready
}

/* Big greeting on a clear screen: written on letter by letter, rests, then rises into the page heading as the app comes in. */
export function WelcomeOverlay({ name, open, onDone }: { name: string; open: boolean; onDone: () => void }) {
  const reduced = useReducedMotion()
  const ready = useAfterSplash()
  const words = `${greeting()},`.split(' ')
  const letters = words.join(' ').length
  useEffect(() => {
    if (!open || !ready) return
    const total = reduced ? 700 : (letters * STEP + 0.35) * 1000 + 380 + HOLD
    const t = setTimeout(onDone, total)
    return () => clearTimeout(t)
  }, [open, ready, reduced, letters, onDone])
  let i = 0
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="welcome" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.42, delay: 0.12, ease: [0.22, 1, 0.36, 1] } }} aria-hidden>
          {ready && (
            <motion.h1 layoutId="greet" className="greet-big" transition={glide}>
              {words.map((w, wi) => (
                <Fragment key={wi}>
                  <span className="greet-word">
                    {Array.from(w).map((ch) => {
                      const d = (i++) * STEP
                      return <motion.span key={d} className="greet-ch" initial={reduced ? { opacity: 0 } : { opacity: 0, y: '0.32em' }} animate={{ opacity: 1, y: 0 }} transition={{ ...smooth, delay: d, opacity: { duration: 0.22, delay: d } }}>{ch}</motion.span>
                    })}
                  </span>
                  {/* the space sits between the word boxes, so it is never dropped */}
                  {wi < words.length - 1 && ' '}
                </Fragment>
              ))}
              {' '}
              <motion.span className="greet-name" initial={reduced ? { opacity: 0 } : { opacity: 0, y: '0.32em' }} animate={{ opacity: 1, y: 0 }} transition={{ ...smooth, delay: i * STEP + 0.06, opacity: { duration: 0.3, delay: i * STEP + 0.06 } }}>{name}</motion.span>
            </motion.h1>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
