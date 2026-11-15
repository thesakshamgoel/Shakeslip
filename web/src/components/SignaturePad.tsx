import { Eraser } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'

/* Draw with a finger, pen or mouse. Strokes are smoothed with quadratic curves and thin out with speed,
   like real ink. Exported as a transparent PNG. */
export function SignaturePad({ onSave, busy }: { onSave: (png: string) => void; busy?: boolean }) {
  const c = useRef<HTMLCanvasElement>(null)
  const pts = useRef<{ x: number; y: number; t: number }[]>([])
  const [has, setHas] = useState(false)
  useEffect(() => {
    const el = c.current!
    const r = el.getBoundingClientRect(), d = window.devicePixelRatio || 1
    el.width = r.width * d; el.height = r.height * d
    const ctx = el.getContext('2d')!
    ctx.scale(d, d); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#141a24'
  }, [])
  const pos = (e: React.PointerEvent) => { const r = c.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() } }
  function move(e: React.PointerEvent) {
    if (!pts.current.length) return
    const p = pos(e), a = pts.current[pts.current.length - 1]
    const ctx = c.current!.getContext('2d')!
    const v = Math.hypot(p.x - a.x, p.y - a.y) / Math.max(1, p.t - a.t)
    ctx.lineWidth = Math.max(1.2, Math.min(3.6, 3.6 - v * 1.4)) * (e.pressure && e.pressure !== 0.5 ? 0.6 + e.pressure : 1)
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(a.x, a.y, (a.x + p.x) / 2, (a.y + p.y) / 2); ctx.lineTo(p.x, p.y); ctx.stroke()
    pts.current.push(p); setHas(true)
  }
  function clear() { const el = c.current!; el.getContext('2d')!.clearRect(0, 0, el.width, el.height); setHas(false) }
  /* trim empty space around the ink before saving */
  function save() {
    const el = c.current!, ctx = el.getContext('2d')!
    const { data, width, height } = ctx.getImageData(0, 0, el.width, el.height)
    let x0 = width, y0 = height, x1 = 0, y1 = 0
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
    if (x1 <= x0) return
    const out = document.createElement('canvas'), m = 8
    out.width = x1 - x0 + m * 2; out.height = y1 - y0 + m * 2
    out.getContext('2d')!.drawImage(el, x0 - m, y0 - m, out.width, out.height, 0, 0, out.width, out.height)
    onSave(out.toDataURL('image/png'))
  }
  return (
    <div className="sp">
      <canvas ref={c} className="sp-c" aria-label="Signature drawing area" onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); pts.current = [pos(e)] }} onPointerMove={move} onPointerUp={() => { pts.current = [] }} onPointerCancel={() => { pts.current = [] }} />
      {!has && <span className="sp-hint" aria-hidden>Sign here</span>}
      <div className="iu-row"><Button variant="ghost" onClick={clear} disabled={!has}><Eraser size={17} aria-hidden />Clear</Button><Button variant="primary" onClick={save} disabled={!has || busy}>Use this signature</Button></div>
    </div>
  )
}
