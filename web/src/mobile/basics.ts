import { useEffect, useState } from 'react'

/* Small phone helpers: is this a phone, a light haptic tick, and where we are in the app's depth. */
const Q = '(max-width: 900px)'
export const isPhone = () => typeof matchMedia !== 'undefined' && matchMedia(Q).matches

export function usePhone(): boolean {
  const [p, setP] = useState(isPhone)
  useEffect(() => {
    const m = matchMedia(Q)
    const on = () => setP(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return p
}

/* A very light vibration where the phone supports it, for taps that change something. Silent with reduced motion. */
export function tick(ms = 8) {
  try { if (!matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(ms) } catch { /* no vibration here */ }
}

/* Where a path sits: 0 = a tab, 1 = opened from a tab, 2 = opened from that. Drives slide direction and the back arrow. */
export function depthOf(pathname: string, tabs: string[]): number {
  if (tabs.includes(pathname) || /\/more$/.test(pathname)) return 0
  const n = pathname.split('/').filter(Boolean).length - 1
  return n >= 3 ? 2 : 1
}

/* Short titles for the back bar on opened screens. */
const TITLES: [RegExp, string][] = [
  [/\/invoices\/[^/]+\/edit$/, 'Edit draft'], [/\/invoices\/[^/]+$/, 'Invoice'], [/\/types\/new$/, 'New invoice type'], [/\/types\/[^/]+$/, 'Invoice type'], [/\/types$/, 'Invoice types'],
  [/\/settings$/, 'Settings'], [/\/updates$/, 'Updates'], [/\/mailbox$/, 'Test mailbox'], [/\/details$/, 'My details'], [/\/connections$/, 'Connections'], [/\/new$/, 'New invoice'],
]
export const titleOf = (pathname: string) => TITLES.find(([r]) => r.test(pathname))?.[1] ?? ''

/* Where the back arrow goes when there is nothing to go back to (opened from a link or the home-screen icon). */
export function parentOf(pathname: string): string {
  const [, app] = pathname.split('/')
  if (/\/invoices\/[^/]+\/edit$/.test(pathname)) return pathname.replace(/\/edit$/, '')
  if (/\/invoices\/[^/]+$/.test(pathname)) return app === 'slip' ? '/slip' : '/studio/invoices'
  if (/\/types\/[^/]+$/.test(pathname)) return `/${app}/types`
  return `/${app}/more`
}

/* A swipe already moved the page itself, so the route change underneath must swap with no slide of its own. */
let swapNext = false
export const markSwipeNav = () => { swapNext = true }
export const takeSwipeNav = () => { const v = swapNext; swapNext = false; return v }
