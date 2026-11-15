import { AnimatePresence, motion } from 'motion/react'
import { Expand, Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { spring, springSoft } from '../lib/motion'
import { IconButton } from './Button'
import type { Mark } from '../lib/types'
import { InvoiceDocument, docPageLabels, type DocData, type DocFocus } from './InvoiceDocument'
import './viewer.css'

const PAGE_W = 794 // A4 at 96 dpi
const PAGE_H = Math.round(PAGE_W * 297 / 210)

/* Paper on a canvas. Zoom is a transform (smooth at 120 Hz); pages cross-fade like turning a sheet. */
export function DocViewer({ d, compact, printable = true, focus = '', page: want, errors = [], pins, onMark }: { d: DocData; compact?: boolean; printable?: boolean; focus?: DocFocus; page?: number; errors?: DocFocus[]; pins?: Mark[]; onMark?: (m: { page: number; x: number; y: number }) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)
  useEffect(() => { const f = () => setFull(document.fullscreenElement === root.current); document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f) }, [])
  const toggleFull = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await root.current?.requestFullscreen() } catch { /* not allowed here */ } }
  const [fit, setFit] = useState(0.6)
  const [zoom, setZoom] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const sheet = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(PAGE_H)
  /* a page can be taller than A4 when it holds a lot; measure it so nothing is cut off */
  useLayoutEffect(() => {
    const el = sheet.current
    if (!el) return
    const ro = new ResizeObserver(() => setH(Math.max(PAGE_H, el.offsetHeight)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [page])
  const labels = docPageLabels(d)
  const pages = labels.length
  /* the editor can turn to a page (for example, Terms) when you start editing it */
  useEffect(() => { if (want !== undefined) setPage(Math.min(want, pages - 1)) }, [want, pages])
  const z = zoom ?? fit
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setFit(Math.max(0.2, Math.min(1.4, (el.clientWidth - (compact ? 0 : 48)) / PAGE_W))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [compact])
  useEffect(() => { if (page >= pages) setPage(pages - 1) }, [page, pages])

  return (
    <div ref={root} className={`dv ${compact ? 'dv-compact' : ''} ${full ? 'dv-full' : ''}`}>
      {!compact && (
        <div className="dv-bar">
          <div className="dv-tabs" role="tablist" aria-label="Pages">
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} role="tab" aria-selected={page === i} className="dv-tab tap" onClick={() => setPage(i)}>
                {page === i && <motion.span layoutId="dv-tab-pill" className="dv-pill" transition={spring} />}
                <span>{labels[i]}</span>
              </button>
            ))}
          </div>
          <div className="dv-zoom">
            <input type="range" className="dv-range" min={30} max={200} step={5} value={Math.round(z * 100)} onChange={(e) => setZoom(Number(e.target.value) / 100)} aria-label="Zoom" />
            <span className="num" aria-live="polite">{Math.round(z * 100)}%</span>
            <IconButton label="Fit to screen" onClick={() => setZoom(null)}><Maximize2 size={15} /></IconButton>
            <IconButton label={full ? 'Exit full screen' : 'Full screen'} onClick={toggleFull}>{full ? <Minimize2 size={15} /> : <Expand size={15} />}</IconButton>
          </div>
        </div>
      )}
      <div className="dv-canvas" ref={box}>
        <motion.div className="dv-stage" animate={{ height: h * z + 2 }} transition={springSoft} initial={false}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={page} className="dv-sheet" style={{ width: PAGE_W, transformOrigin: 'top center', x: '-50%' }}
              initial={{ opacity: 0, scale: z * 0.97, y: 12 }} animate={{ opacity: 1, scale: z, y: 0 }} exit={{ opacity: 0, scale: z * 0.98, y: -8 }} transition={springSoft}>
              <div ref={sheet} style={{ position: 'relative' }}>
                <InvoiceDocument d={d} only={page} focus={focus} errors={errors} />
                {(pins?.length || onMark) && (
                  <div className={`dv-pins ${onMark ? 'on' : ''}`} onClick={(e) => { if (!onMark || (e.target as HTMLElement).closest('.dv-pin')) return; const r = e.currentTarget.getBoundingClientRect(); onMark({ page, x: Math.round(((e.clientX - r.left) / r.width) * 1000) / 10, y: Math.round(((e.clientY - r.top) / r.height) * 1000) / 10 }) }}>
                    {pins?.map((m, i) => m.page === page && <span key={m.id ?? i} className="dv-pin" title={m.text} style={{ left: `${m.x}%`, top: `${m.y}%`, transform: `translate(-50%, -50%) scale(${1 / z})` }}>{i + 1}</span>)}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
      {printable && createPortal(<div className="print-root"><InvoiceDocument d={d} /></div>, document.body)}
    </div>
  )
}
