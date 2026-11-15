import { createContext, useContext, useEffect, useRef, type RefObject } from 'react'
import { tick } from './basics'

/* One horizontal-swipe engine for the phone app.
   - A page can claim swipes with useSwipeClaim (the editor uses it for its steps).
   - Otherwise swiping moves between tabs, and a swipe from the left edge goes back.
   - It never fights scrolling: it only starts when the finger moves mostly sideways, and it stays out of inputs,
     sideways-scrolling rows, the invoice zoom area, sheets and the search palette. */
export type Claim = { left?: () => boolean | 'block' | void; right?: () => boolean | 'block' | void }
export type SwipeHandlers = { tabLeft?: () => boolean; tabRight?: () => boolean; back?: () => boolean }

const ClaimCtx = createContext<RefObject<Claim | null> | null>(null)
export const SwipeClaimProvider = ClaimCtx.Provider

/* left = the finger moves left (go forward); right = the finger moves right (go back). Return 'block' to stop the tab swipe underneath. */
export function useSwipeClaim(c: Claim) {
  const ref = useContext(ClaimCtx)
  const cur = useRef(c)
  cur.current = c
  useEffect(() => {
    if (!ref) return
    ref.current = { left: () => cur.current.left?.(), right: () => cur.current.right?.() }
    return () => { ref.current = null }
  }, [ref])
}

const BLOCK = 'input, textarea, select, canvas, dialog, [contenteditable], [data-noswipe], .dv-canvas, .dv-pins, .pal, .sel-pop, .range'
function sideways(el: Element | null): boolean {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const s = getComputedStyle(n)
    if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 4) return true
  }
  return false
}

export function useSwipe(el: RefObject<HTMLElement | null>, claim: RefObject<Claim | null>, h: SwipeHandlers, enabled: boolean) {
  const hh = useRef(h)
  hh.current = h
  useEffect(() => {
    const root = el.current
    if (!root || !enabled) return
    let sx = 0, sy = 0, t0 = 0, on: 'x' | 'y' | '' = '', edge = false, active = false
    const reset = (animate: boolean) => {
      root.style.transition = animate ? 'transform .32s cubic-bezier(.22, 1, .36, 1)' : ''
      root.style.transform = ''
      if (animate) setTimeout(() => { root.style.transition = '' }, 340)
    }
    const start = (e: TouchEvent) => {
      active = false; on = ''
      if (e.touches.length !== 1 || (e.target as Element).closest(BLOCK) || sideways(e.target as Element)) return
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; t0 = Date.now(); edge = sx < 24; active = true
    }
    const move = (e: TouchEvent) => {
      if (!active) return
      const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy
      if (!on) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        on = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y'
      }
      if (on !== 'x') return
      /* the page leans with the finger, a little, and more when there is somewhere to go */
      const k = Math.abs(dx) > 90 ? 0.18 : 0.3
      root.style.transform = `translate3d(${Math.max(-72, Math.min(72, dx * k))}px, 0, 0)`
    }
    const end = (e: TouchEvent) => {
      if (!active || on !== 'x') { active = false; return }
      active = false
      const dx = (e.changedTouches[0]?.clientX ?? sx) - sx, dt = Math.max(1, Date.now() - t0)
      const fast = Math.abs(dx) / dt > 0.45
      if (Math.abs(dx) < (fast ? 44 : 78)) return reset(true)
      const cl = claim.current
      const own = dx < 0 ? cl?.left?.() : cl?.right?.()
      let done = own === true
      if (!done && own !== 'block') {
        if (dx > 0 && edge) done = hh.current.back?.() === true
        if (!done) done = dx < 0 ? hh.current.tabLeft?.() === true : hh.current.tabRight?.() === true
      }
      if (done) { tick(10); reset(false) } else reset(true)
    }
    root.addEventListener('touchstart', start, { passive: true })
    root.addEventListener('touchmove', move, { passive: true })
    root.addEventListener('touchend', end, { passive: true })
    root.addEventListener('touchcancel', () => { active = false; reset(true) }, { passive: true })
    return () => { root.removeEventListener('touchstart', start); root.removeEventListener('touchmove', move); root.removeEventListener('touchend', end); reset(false) }
  }, [el, claim, enabled])
}
