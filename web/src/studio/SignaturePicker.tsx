import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { ImageUpload } from '../components/ImageUpload'
import { SignaturePad } from '../components/SignaturePad'
import { errText, put } from '../lib/api'
import { smooth, spring } from '../lib/motion'
import { useSession } from '../lib/session'
import { useToast } from '../lib/toast'
import type { Signature } from '../lib/types'

const FONTS = [
  { id: 'great-vibes', css: "'Great Vibes', cursive" }, { id: 'allura', css: "'Allura', cursive" }, { id: 'dancing-script', css: "'Dancing Script', cursive" },
  { id: 'sacramento', css: "'Sacramento', cursive" }, { id: 'parisienne', css: "'Parisienne', cursive" }, { id: 'caveat', css: "'Caveat', cursive" },
] as const
const MODES = [{ id: 'draw', label: 'Draw' }, { id: 'type', label: 'Type' }, { id: 'upload', label: 'Upload' }] as const

/* The three ways from the original: draw on a pad, type in a handwriting style, or upload an image. */
export function SignaturePicker() {
  const { me, refresh } = useSession()
  const cur: Signature = me?.business?.signature ?? {}
  const toast = useToast()
  const [mode, setMode] = useState<'draw' | 'type' | 'upload'>(cur.kind === 'image' ? 'upload' : 'type')
  const [text, setText] = useState(cur.text ?? me?.user?.name ?? '')
  const [busy, setBusy] = useState(false)
  async function save(body: Signature) {
    if (busy) return
    setBusy(true)
    try { await put('/studio/signature', body); await refresh(); toast.ok(body.kind === 'none' ? 'Signature removed.' : 'Signature saved. New invoices are signed with it.') } catch (e) { toast.bad(errText(e)) } finally { setBusy(false) }
  }
  return (
    <section className="ed-sec">
      <div className="st-row"><h2>Signature</h2>{cur.kind && cur.kind !== 'none' && <Button variant="ghost" onClick={() => save({ kind: 'none' })}>Remove</Button>}</div>
      {cur.kind === 'image' && cur.image && <div className="sig-now"><small className="hint">Current</small><img src={cur.image} alt="Your current signature" /></div>}
      <div className="seg3" role="tablist" aria-label="Signature method">
        {MODES.map((m) => (
          <button key={m.id} role="tab" aria-selected={mode === m.id} className="seg3-b tap" onClick={() => setMode(m.id)}>
            {mode === m.id && <motion.span layoutId="sig-mode" className="seg3-pill" transition={spring} />}<span>{m.label}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={smooth}>
          {mode === 'draw' && <SignaturePad busy={busy} onSave={(png) => save({ kind: 'image', image: png })} />}
          {mode === 'type' && (
            <div className="dlg-form">
              <Field label="Name to sign with" value={text} maxLength={60} onChange={(e) => setText(e.target.value)} />
              <div className="sigs" role="radiogroup" aria-label="Handwriting style">
                {FONTS.map((f) => (
                  <button key={f.id} type="button" role="radio" aria-checked={cur.kind === 'typed' && cur.font === f.id} className="sig tap" disabled={!text.trim() || busy} onClick={() => save({ kind: 'typed', text: text.trim(), font: f.id })}>
                    <span style={{ fontFamily: f.css }}>{text || 'Your name'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {mode === 'upload' && <ImageUpload label="Signature image" value={cur.kind === 'image' ? cur.image ?? '' : ''} busy={busy} onChange={(v) => save(v ? { kind: 'image', image: v } : { kind: 'none' })} hint="A photo of your signature on white paper works. We shrink it automatically." />}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
