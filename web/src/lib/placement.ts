import { useLayoutEffect, useState, type RefObject } from 'react'

/* The nearest ancestor that scrolls or clips (a dialog body, a scrolling panel), or the window. */
function boundsOf(el: HTMLElement): { top: number; bottom: number } {
  for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY
    if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') { const r = n.getBoundingClientRect(); return { top: Math.max(0, r.top), bottom: Math.min(innerHeight, r.bottom) } }
  }
  return { top: 0, bottom: innerHeight }
}

/* Where a popup should open so it stays on screen and inside whatever scrolls around it:
   up when there is no room below, to the left edge when it would run off the right, and never taller than the room it has.
   A popup that spills past its scrolling parent makes the parent scroll as well (a double scroll), so it is sized to fit instead. */
export function usePlacement(open: boolean, ref: RefObject<HTMLElement | null>, height: number, width = 0) {
  const [p, setP] = useState({ up: false, end: false, maxH: height })
  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const r = ref.current.getBoundingClientRect(), b = boundsOf(ref.current)
    const below = b.bottom - r.bottom - 12, above = r.top - b.top - 12
    const up = below < Math.min(height, 220) && above > below
    const room = Math.max(120, up ? above : below)
    setP({ up, end: width > 0 && r.left + width > innerWidth - 8, maxH: Math.min(height, room) })
  }, [open, ref, height, width])
  return p
}
