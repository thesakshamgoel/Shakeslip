import { AnimatePresence, motion } from 'motion/react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { springSoft } from '../lib/motion'
import { Button } from './Button'

/* Any image becomes a small, crisp logo: resized in the browser (max 512 px), transparent PNG kept,
   photos become WebP. Nothing leaves the device until you save. */
export async function shrinkImage(file: File, max = 512): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Use a PNG, JPG or WebP image.')
  if (file.size > 8_000_000) throw new Error('That image is over 8 MB. Try a smaller one.')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('That image could not be read.')); i.src = url })
    const k = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k))
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    let out = c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/webp', 0.9)
    if (out.length > 400_000) out = c.toDataURL('image/webp', 0.8)
    if (out.length > 400_000) throw new Error('That image is too detailed. Try a simpler logo.')
    return out
  } finally { URL.revokeObjectURL(url) }
}

export function ImageUpload({ value, onChange, label, hint, busy }: { value: string; onChange: (v: string) => void | Promise<void>; label: string; hint?: string; busy?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [err, setErr] = useState('')
  const [drag, setDrag] = useState(false)
  async function take(f?: File) {
    if (!f) return
    setErr('')
    try { await onChange(await shrinkImage(f)) } catch (e) { setErr((e as Error).message) }
  }
  return (
    <div className="iu">
      <span className="iu-label">{label}</span>
      <div className={`iu-drop ${drag ? 'is-drag' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void take(e.dataTransfer.files[0]) }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {value ? (
            <motion.img key={value.slice(-24)} src={value} alt={`${label} preview`} className="iu-img" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={springSoft} />
          ) : (
            <motion.span key="empty" className="iu-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ImagePlus size={22} aria-hidden />Drop an image here</motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="iu-row">
        <Button disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={17} aria-hidden />{value ? 'Replace' : 'Choose image'}</Button>
        {value && <Button variant="ghost" disabled={busy} onClick={() => onChange('')}><Trash2 size={17} aria-hidden />Remove</Button>}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { void take(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      {err ? <small className="iu-err" role="alert">{err}</small> : hint && <small className="hint">{hint}</small>}
    </div>
  )
}
