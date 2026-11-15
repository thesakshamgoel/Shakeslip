import { useSyncExternalStore } from 'react'

/* Counts requests in flight. The brand ring spins while anything is working. */
let n = 0
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
export const busyStart = () => { n++; emit() }
export const busyEnd = () => { n = Math.max(0, n - 1); emit() }
export const useBusy = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => n > 0)
