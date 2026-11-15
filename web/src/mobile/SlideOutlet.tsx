import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { pageVariants } from '../lib/motion'
import { depthOf, takeSwipeNav } from './basics'
import { bindSwipeX, newPageX } from './swipeX'

/* Where the next screen comes from, like a phone app:
   opening something slides it in from the right while the old one steps back and dims;
   going back reverses that; moving between tabs slides sideways in the direction of the tab;
   after a swipe, the old screen carries on out from where the finger left it and the next one slides in right beside it. */
type Move = { kind: 'push' | 'pop' | 'tab' | 'swipe' | 'none'; dir: number; w: number; off?: number }
const EASE = [0.32, 0.72, 0, 1] as const
const SLIDE = {
  in: (m: Move) => (m.kind === 'swipe' ? { x: -m.dir * m.w + (m.off ?? 0) } : m.kind === 'push' ? { x: '100%' } : m.kind === 'pop' ? { x: '-24%', opacity: 0.6 } : m.kind === 'tab' ? { x: `${m.dir * 22}%`, opacity: 0 } : { opacity: 0 }),
  on: (m: Move) => ({ x: 0, opacity: 1, transition: { duration: m.kind === 'swipe' ? 0.34 : 0.42, ease: EASE } }),
  out: (m: Move) => (m.kind === 'swipe' ? { x: m.dir * m.w, transition: { duration: 0.34, ease: EASE } }
    : m.kind === 'push' ? { x: '-24%', opacity: 0.6, transition: { duration: 0.42, ease: EASE } }
    : m.kind === 'pop' ? { x: '100%', transition: { duration: 0.38, ease: EASE } }
    : m.kind === 'tab' ? { x: `${-m.dir * 22}%`, opacity: 0, transition: { duration: 0.28, ease: EASE } } : { opacity: 0, transition: { duration: 0.12 } }),
}

export function SlideOutlet({ phone, tabs }: { phone: boolean; tabs: string[] }) {
  const outlet = useOutlet()
  const { pathname } = useLocation()
  const prev = useRef(pathname)
  const swipe = useRef<ReturnType<typeof takeSwipeNav>>(null), seen = useRef(pathname)
  if (seen.current !== pathname) { swipe.current = takeSwipeNav(); seen.current = pathname }
  let move: Move = { kind: 'none', dir: 0, w: 0 }
  if (prev.current !== pathname && swipe.current) {
    /* dir is the way the old screen leaves: -1 = to the left (finger moved left), +1 = to the right */
    move = { kind: 'swipe', dir: swipe.current.dir, w: swipe.current.w, off: swipe.current.off }
  } else if (prev.current !== pathname) {
    const a = depthOf(prev.current, tabs), b = depthOf(pathname, tabs)
    const ia = tabs.indexOf(prev.current), ib = tabs.indexOf(pathname)
    move = b > a ? { kind: 'push', dir: 1, w: 0 } : b < a ? { kind: 'pop', dir: -1, w: 0 } : ia >= 0 && ib >= 0 ? { kind: 'tab', dir: ib > ia ? 1 : -1, w: 0 } : { kind: 'tab', dir: 1, w: 0 }
  }
  const last = useRef(move)
  if (move.kind !== 'none') last.current = move
  /* remember this path once it has rendered, so the next change can compare against it */
  useEffect(() => { prev.current = pathname }, [pathname])
  /* each screen has its own position value, so the one leaving keeps where it was */
  const x = useMemo(() => newPageX(), [pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { bindSwipeX(x) }, [x])

  if (!phone) return <motion.div key={pathname} variants={pageVariants} initial="initial" animate="animate" className="page">{outlet}</motion.div>
  return (
    <div className="slide-host">
      <AnimatePresence mode="popLayout" custom={last.current} initial={false}>
        <motion.div key={pathname} custom={last.current} variants={SLIDE} initial="in" animate="on" exit="out" style={{ x }} className="page slide-page">{outlet}</motion.div>
      </AnimatePresence>
    </div>
  )
}
