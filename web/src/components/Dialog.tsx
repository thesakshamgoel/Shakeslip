import { useEffect, useRef, type PointerEvent as RPE, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { tick } from '../mobile/basics'
import { IconButton } from './Button'
import './dialog.css'

/* Native <dialog>: focus is trapped, Escape closes, background is inert. We also lock page scroll. */
export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const body = useRef<HTMLDivElement>(null)
  /* on a phone the sheet follows a finger dragged down from its top, and closes if you throw or pull it far enough */
  function drag(e: RPE) {
    if (e.pointerType === 'mouse' || !body.current) return
    const el = body.current, y0 = e.clientY, t0 = Date.now()
    let dy = 0
    const move = (m: PointerEvent) => { dy = Math.max(0, m.clientY - y0); el.style.transition = 'none'; el.style.transform = `translate3d(0, ${dy}px, 0)` }
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up)
      if (dy > 110 || dy / Math.max(1, Date.now() - t0) > 0.6) { tick(10); el.style.transition = 'transform .22s cubic-bezier(.22, 1, .36, 1)'; el.style.transform = 'translate3d(0, 100%, 0)'; setTimeout(() => { el.style.transform = ''; el.style.transition = ''; onClose() }, 200) }
      else { el.style.transition = 'transform .3s cubic-bezier(.22, 1, .36, 1)'; el.style.transform = '' }
    }
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up)
  }
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) { d.showModal(); document.body.style.overflow = 'hidden' }
    if (!open && d.open) d.close()
    return () => { document.body.style.overflow = '' }
  }, [open])
  return (
    <dialog ref={ref} aria-label={title || undefined} className={`dlg ${wide ? 'dlg-wide' : ''}`} onClose={() => { document.body.style.overflow = ''; onClose() }} onClick={(e) => { if (e.target === ref.current) onClose() }}>
      <div className="dlg-body" ref={body}>
        <div className="dlg-grab" onPointerDown={drag} aria-hidden><i /></div>
        <div className="dlg-head" onPointerDown={drag}>
          {title ? <h2>{title}</h2> : <span />}
          <IconButton label="Close" onClick={onClose}><X size={18} /></IconButton>
        </div>
        {children}
      </div>
    </dialog>
  )
}
