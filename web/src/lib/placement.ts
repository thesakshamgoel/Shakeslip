import { useLayoutEffect, useState, type RefObject } from 'react'

/* Where a popup should open so it stays on screen: up when there is no room below, to the left edge when it would run off the right. */
export function usePlacement(open: boolean, ref: RefObject<HTMLElement | null>, height: number, width = 0) {
  const [p, setP] = useState({ up: false, end: false })
  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const below = innerHeight - r.bottom, above = r.top
    setP({ up: below < height && above > below, end: width > 0 && r.left + width > innerWidth - 8 })
  }, [open, ref, height, width])
  return p
}
