import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { pageVariants } from '../lib/motion'
import { depthOf, takeSwipeNav } from './basics'

/* Where the next screen comes from, like a phone app:
   opening something slides it in from the right while the old one steps back and dims;
   going back reverses that; moving between tabs slides sideways in the direction of the tab. */
type Move = { kind: 'push' | 'pop' | 'tab' | 'swap' | 'none'; dir: number }
const EASE = [0.32, 0.72, 0, 1] as const
const SLIDE = {
  in: (m: Move) => (m.kind === 'swap' ? { x: 0, opacity: 1 } : m.kind === 'push' ? { x: '100%' } : m.kind === 'pop' ? { x: '-24%', opacity: 0.6 } : m.kind === 'tab' ? { x: `${m.dir * 22}%`, opacity: 0 } : { opacity: 0 }),
  on: { x: 0, opacity: 1, transition: { duration: 0.42, ease: EASE } },
  out: (m: Move) => (m.kind === 'swap' ? { opacity: 0, transition: { duration: 0 } } : m.kind === 'push' ? { x: '-24%', opacity: 0.6, transition: { duration: 0.42, ease: EASE } }
    : m.kind === 'pop' ? { x: '100%', transition: { duration: 0.38, ease: EASE } }
    : m.kind === 'tab' ? { x: `${-m.dir * 22}%`, opacity: 0, transition: { duration: 0.28, ease: EASE } } : { opacity: 0, transition: { duration: 0.12 } }),
}

export function SlideOutlet({ phone, tabs }: { phone: boolean; tabs: string[] }) {
  const outlet = useOutlet()
  const { pathname } = useLocation()
  const prev = useRef(pathname)
  const swap = useRef(false), seen = useRef(pathname)
  if (seen.current !== pathname) { swap.current = takeSwipeNav(); seen.current = pathname }
  let move: Move = { kind: 'none', dir: 0 }
  if (prev.current !== pathname && swap.current) move = { kind: 'swap', dir: 0 }
  else if (prev.current !== pathname) {
    const a = depthOf(prev.current, tabs), b = depthOf(pathname, tabs)
    const ia = tabs.indexOf(prev.current), ib = tabs.indexOf(pathname)
    move = b > a ? { kind: 'push', dir: 1 } : b < a ? { kind: 'pop', dir: -1 } : ia >= 0 && ib >= 0 ? { kind: 'tab', dir: ib > ia ? 1 : -1 } : { kind: 'tab', dir: 1 }
  }
  const last = useRef(move)
  if (move.kind !== 'none') last.current = move
  /* remember this path once it has rendered, so the next change can compare against it */
  useEffect(() => { prev.current = pathname }, [pathname])

  if (!phone) return <motion.div key={pathname} variants={pageVariants} initial="initial" animate="animate" className="page">{outlet}</motion.div>
  return (
    <div className="slide-host">
      <AnimatePresence mode="popLayout" custom={last.current} initial={false}>
        <motion.div key={pathname} custom={last.current} variants={SLIDE} initial="in" animate="on" exit="out" className="page slide-page">{outlet}</motion.div>
      </AnimatePresence>
    </div>
  )
}
