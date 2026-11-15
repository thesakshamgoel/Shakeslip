import { useCallback, useEffect, useReducer } from 'react'
import type { Extra, LineItem } from '../../lib/types'

export type Draft = {
  linkId: string; theme: string; items: LineItem[]; fields: Record<string, string>; gstPct: number; taxInclusive: boolean
  discount: number; advance: number; issued: string; due: string; note: string; project: string; terms: string[]; extra: Extra
}
type H = { past: Draft[]; now: Draft; future: Draft[]; dirty: boolean }
type A = { t: 'set'; patch: Partial<Draft>; merge?: string } | { t: 'undo' } | { t: 'redo' } | { t: 'clean' }

let lastKey = '', lastAt = 0
/* Typing in the same field within a second is one undo step, not one per keystroke. */
function reducer(s: H, a: A): H {
  if (a.t === 'undo') return s.past.length ? { past: s.past.slice(0, -1), now: s.past[s.past.length - 1], future: [s.now, ...s.future], dirty: true } : s
  if (a.t === 'redo') return s.future.length ? { past: [...s.past, s.now], now: s.future[0], future: s.future.slice(1), dirty: true } : s
  if (a.t === 'clean') return { ...s, dirty: false }
  const now = Date.now()
  const merge = !!a.merge && a.merge === lastKey && now - lastAt < 1000
  lastKey = a.merge ?? ''; lastAt = now
  return { past: merge ? s.past : [...s.past.slice(-80), s.now], now: { ...s.now, ...a.patch }, future: [], dirty: true }
}

export function useDraft(initial: Draft, startDirty = false) {
  const [s, dispatch] = useReducer(reducer, { past: [], now: initial, future: [], dirty: startDirty })
  const set = useCallback((patch: Partial<Draft>, merge?: string) => dispatch({ t: 'set', patch, merge }), [])
  const undo = useCallback(() => dispatch({ t: 'undo' }), [])
  const redo = useCallback(() => dispatch({ t: 'redo' }), [])
  const clean = useCallback(() => dispatch({ t: 'clean' }), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable]')) return // fields keep their own undo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])
  useEffect(() => {
    if (!s.dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [s.dirty])
  return { d: s.now, set, undo, redo, clean, canUndo: s.past.length > 0, canRedo: s.future.length > 0, dirty: s.dirty }
}

export const isoIn = (days: number, from = new Date()) => new Date(from.getTime() + days * 86_400_000).toISOString()
export const daysBetween = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000))
