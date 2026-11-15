import { useEffect, useRef, useState } from 'react'
import { LogoMark } from '../brand/icons'
import { tick } from './basics'

/* Pull down at the top of a list to refresh it, like every phone app. Everything that loads data listens for 'ss-refresh'.
   The Shakeslip mark turns while it works. Transform and opacity only. */
const NO = 'input, textarea, select, canvas, dialog, [data-noswipe], .dv-canvas, .pal'
const LIMIT = 118, TRIGGER = 74

export function PullToRefresh() {
  const box = useRef<HTMLDivElement>(null)
  const [spin, setSpin] = useState(false)
  useEffect(() => {
    let sy = 0, sx = 0, on = false, dist = 0, busy = false, armed = false
    const paint = (d: number, animate = false) => {
      const e = box.current; if (!e) return
      e.style.transition = animate ? 'transform .35s cubic-bezier(.22, 1, .36, 1), opacity .25s' : 'none'
      e.style.transform = `translate3d(-50%, ${d - 64}px, 0) scale(${0.7 + Math.min(1, d / TRIGGER) * 0.3})`
      e.style.opacity = String(Math.min(1, d / 40))
      const m = e.firstElementChild as HTMLElement | null
      if (m && !busy) m.style.transform = `rotate(${d * 3}deg)`
    }
    const start = (e: TouchEvent) => {
      on = false; armed = false
      if (busy || window.scrollY > 2 || e.touches.length !== 1 || (e.target as Element).closest(NO)) return
      sy = e.touches[0].clientY; sx = e.touches[0].clientX; armed = true
    }
    const move = (e: TouchEvent) => {
      if (!armed) return
      const dy = e.touches[0].clientY - sy, dx = e.touches[0].clientX - sx
      if (!on) { if (dy < 10 || Math.abs(dy) < Math.abs(dx) * 1.2) { if (dy < -6) armed = false; return } on = true }
      dist = Math.min(LIMIT, (dy - 10) * 0.5)
      paint(dist)
      if (dist >= TRIGGER && !busy && box.current?.dataset.hit !== '1') { box.current!.dataset.hit = '1'; tick(12) }
      if (dist < TRIGGER && box.current) box.current.dataset.hit = '0'
    }
    const end = () => {
      if (!on) return
      on = false; armed = false
      if (dist >= TRIGGER) {
        busy = true; setSpin(true); paint(TRIGGER - 10, true)
        window.dispatchEvent(new Event('ss-refresh'))
        setTimeout(() => { busy = false; setSpin(false); dist = 0; paint(0, true); if (box.current) box.current.style.opacity = '0' }, 900)
      } else { dist = 0; paint(0, true); if (box.current) box.current.style.opacity = '0' }
    }
    document.addEventListener('touchstart', start, { passive: true })
    document.addEventListener('touchmove', move, { passive: true })
    document.addEventListener('touchend', end, { passive: true })
    document.addEventListener('touchcancel', end, { passive: true })
    return () => { document.removeEventListener('touchstart', start); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', end); document.removeEventListener('touchcancel', end) }
  }, [])
  return <div ref={box} className="ptr" aria-hidden><LogoMark size={34} spinning={spin} className="ptr-m" /></div>
}
