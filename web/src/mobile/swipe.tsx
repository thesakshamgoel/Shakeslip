import { createContext, useContext, useEffect, useRef, type RefObject } from 'react'
import { markSwipeNav, takeSwipeNav, tick } from './basics'

/* One horizontal-swipe engine for the phone app.
   - A page can claim swipes with useSwipeClaim (the editor uses it for its steps).
   - Otherwise swiping moves between tabs, and a swipe from the left edge goes back.
   - It never fights scrolling: it only starts when the finger moves mostly sideways, and it stays out of inputs,
     sideways-scrolling rows, the invoice zoom area, sheets and the search palette. */
export type Claim = { left?: () => boolean | 'block' | void; right?: () => boolean | 'block' | void; canLeft?: () => boolean; canRight?: () => boolean }
export type SwipeHandlers = { tabLeft?: () => boolean; tabRight?: () => boolean; back?: () => boolean; canTabLeft?: () => boolean; canTabRight?: () => boolean; canBack?: () => boolean }

const ClaimCtx = createContext<RefObject<Claim | null> | null>(null)
export const SwipeClaimProvider = ClaimCtx.Provider

/* left = the finger moves left (go forward); right = the finger moves right (go back). Return 'block' to stop the tab swipe underneath. */
/* left = the finger moves left (go forward); right = the finger moves right (go back). Return 'block' to stop the tab swipe underneath. */
export function useSwipeClaim(c: Claim) {
  const ref = useContext(ClaimCtx)
  const cur = useRef(c)
  cur.current = c
  useEffect(() => {
    if (!ref) return
    ref.current = { left: () => cur.current.left?.(), right: () => cur.current.right?.(), canLeft: () => cur.current.canLeft?.() ?? true, canRight: () => cur.current.canRight?.() ?? true }
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

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

export function useSwipe(el: RefObject<HTMLElement | null>, claim: RefObject<Claim | null>, h: SwipeHandlers, enabled: boolean) {
  const hh = useRef(h)
  hh.current = h
  useEffect(() => {
    const root = el.current
    if (!root || !enabled) return
    let sx = 0, sy = 0, t0 = 0, on: 'x' | 'y' | '' = '', edge = false, active = false, anim: Animation | null = null
    /* the page rides the compositor: one transform write per touch event, nothing else */
    const set = (x: number) => { root.style.transform = x ? `translate3d(${x}px, 0, 0)` : ''; root.style.opacity = '' }
    const stop = () => { anim?.cancel(); anim = null }
    const run = (from: number, to: number, ms: number, done?: () => void, fade?: [number, number]) => {
      stop()
      const [o0, o1] = fade ?? [1, 1]
      root.style.transform = `translate3d(${to}px, 0, 0)`; root.style.opacity = String(o1)
      anim = root.animate([{ transform: `translate3d(${from}px, 0, 0)`, opacity: o0 }, { transform: `translate3d(${to}px, 0, 0)`, opacity: o1 }], { duration: ms, easing: EASE })
      anim.onfinish = () => { anim = null; done?.() }
      anim.oncancel = () => { anim = null }
    }
    const settle = (from: number) => run(from, 0, 320, () => set(0))
    /* where can this swipe go? asked before the page moves, so the edges feel firm instead of broken */
    const dest = (dx: number): boolean => {
      const cl = claim.current, left = dx < 0
      const own = left ? cl?.left : cl?.right
      const can = left ? cl?.canLeft : cl?.canRight
      if (own) { const c = can ? can() : true; if (c) return true; if (can) return false }
      if (!left && edge && hh.current.canBack?.()) return true
      return left ? hh.current.canTabLeft?.() === true : hh.current.canTabRight?.() === true
    }
    const start = (e: TouchEvent) => {
      active = false; on = ''
      if (e.touches.length !== 1 || (e.target as Element).closest(BLOCK) || sideways(e.target as Element)) return
      stop(); set(0)
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; t0 = Date.now(); edge = sx < 24; active = true
    }
    let lastX = 0
    const move = (e: TouchEvent) => {
      if (!active) return
      const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy
      if (!on) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        on = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'x' : 'y'
        if (on === 'x') { root.style.willChange = 'transform'; sx += Math.sign(dx) * 10 }
      }
      if (on !== 'x') return
      const d = e.touches[0].clientX - sx
      /* one to one with the finger where there is somewhere to go, a firm rubber band where there is not */
      lastX = dest(d) ? d : Math.sign(d) * Math.min(48, Math.abs(d) * 0.28)
      set(lastX)
    }
    const finish = (e: TouchEvent | null) => {
      const was = on === 'x'
      active = false
      root.style.willChange = ''
      if (!was) return
      const dx = (e?.changedTouches[0]?.clientX ?? sx) - sx, dt = Math.max(1, Date.now() - t0)
      const fast = Math.abs(dx) / dt > 0.5
      const w = root.clientWidth || innerWidth
      if (!e || Math.abs(dx) < (fast ? 40 : w * 0.28) || !dest(dx)) return settle(lastX)
      const dir = dx < 0 ? -1 : 1, cl = claim.current
      /* slide the old page the rest of the way out from where the finger left it, then the new one carries on the same motion */
      const ms = Math.max(110, Math.min(220, ((w - Math.abs(lastX)) / w) * 300))
      tick(10)
      run(lastX, dir * w * 0.45, ms, () => {
        markSwipeNav(); setTimeout(() => { takeSwipeNav() }, 120)
        const own = dx < 0 ? cl?.left?.() : cl?.right?.()
        let ok = own === true
        if (!ok && own !== 'block') {
          if (dx > 0 && edge) ok = hh.current.back?.() === true
          if (!ok) ok = dx < 0 ? hh.current.tabLeft?.() === true : hh.current.tabRight?.() === true
        }
        /* the new page starts just behind where the old one left and glides in */
        run(ok ? -dir * w * 0.3 : dir * w * 0.45, 0, ok ? 300 : 240, () => set(0), [0, 1])
      }, [1, 0])
    }
    const end = (e: TouchEvent) => finish(e)
    const cancel = () => finish(null)
    root.addEventListener('touchstart', start, { passive: true })
    root.addEventListener('touchmove', move, { passive: true })
    root.addEventListener('touchend', end, { passive: true })
    root.addEventListener('touchcancel', cancel, { passive: true })
    return () => { root.removeEventListener('touchstart', start); root.removeEventListener('touchmove', move); root.removeEventListener('touchend', end); root.removeEventListener('touchcancel', cancel); stop(); set(0) }
  }, [el, claim, enabled])
}
