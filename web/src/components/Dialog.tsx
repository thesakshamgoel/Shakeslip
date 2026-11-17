import { useEffect, useRef, type PointerEvent as RPE, type ReactNode } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { fadeOut, smooth, smoothOut, snappy } from '../lib/motion'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from './Button'
import './dialog.css'
let locks = 0, priorOverflow = ''
export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null), body = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const isOpen = useRef(open); isOpen.current = open
  const release = useRef<(() => void) | null>(null), dragCleanup = useRef<(() => void) | null>(null)
  useEffect(() => {
    const d = ref.current, el = body.current
    if (!d || !el) return
    let cancelled = false
    const phone = matchMedia('(max-width:600px)').matches
    /* sheets rise on the smooth spring; on desktop the panel grows in on the snappy one, like a macOS sheet */
    const transition = reduced ? { duration: 0.15 } : phone ? smooth : snappy
    let control: ReturnType<typeof animate> | undefined
    if (open) {
      if (!d.open) {
        d.showModal()
        if (!locks++) { priorOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' }
        release.current = () => { if (--locks === 0) document.body.style.overflow = priorOverflow; release.current = null }
        el.style.transform = reduced ? 'none' : phone ? 'translateY(100%)' : 'translateY(8px) scale(.96)'
        el.style.opacity = phone ? '1' : '0'
      }
      control = animate(el, { transform: 'translateY(0px) scale(1)', opacity: 1 }, transition)
    } else if (d.open) {
      /* closing uses the same physics, a little quicker, starting from wherever the sheet is (even mid-drag) */
      control = animate(el, { transform: reduced ? 'none' : phone ? 'translateY(100%)' : 'translateY(6px) scale(.97)', opacity: phone ? 1 : 0 }, reduced ? { duration: 0.12 } : phone ? smoothOut : fadeOut)
      void control.then(() => { if (!cancelled) { d.close(); release.current?.() } })
    }
    return () => { cancelled = true; control?.stop() }
  }, [open, reduced])
  useEffect(() => () => { dragCleanup.current?.(); ref.current?.close(); release.current?.() }, [])
  function drag(e: RPE) {
    if (e.pointerType === 'mouse' || !body.current || !matchMedia('(max-width:600px)').matches || (e.target as HTMLElement).closest('button')) return
    dragCleanup.current?.()
    const el = body.current, y0 = e.clientY, start = performance.now()
    let dy = 0
    const move = (m: PointerEvent) => { dy = Math.max(0, m.clientY - y0); el.style.transform = `translateY(${dy}px)` }
    const cleanup = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', cancel); dragCleanup.current = null }
    const snap = () => { void animate(el, { transform: 'translateY(0px)' }, reduced ? { duration: 0 } : snappy) }
    const up = () => { cleanup(); if (dy > 110 || dy > 30 && dy / Math.max(1, performance.now() - start) > .6) { onClose(); requestAnimationFrame(() => { if (isOpen.current) snap() }) } else snap() }
    const cancel = () => { cleanup(); snap() }
    dragCleanup.current = cleanup
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', cancel)
  }
  return createPortal(<dialog ref={ref} aria-label={title || undefined} className={`dlg ${wide ? 'dlg-wide' : ''}`} onCancel={(e) => { e.preventDefault(); onClose() }} onClick={(e) => { if (e.target === ref.current) onClose() }}>
    <div className="dlg-body" ref={body}><div className="dlg-grab" onPointerDown={drag} aria-hidden><i /></div><div className="dlg-head" onPointerDown={drag}>{title ? <h2>{title}</h2> : <span />}<IconButton type="button" label="Close" onClick={onClose}><X size={18} /></IconButton></div>{children}</div>
  </dialog>, document.body)
}
