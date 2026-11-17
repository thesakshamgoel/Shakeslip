import { lazy, Suspense } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { Blocks, numberHeadings, parseFormatted } from './docParts'
import './blockeditor.css'
const RichEditor = lazy(() => import('./editor/RichEditor'))
export function DocumentEditor(props: { value: string; onChange: (value: string) => void; max?: number; label?: string }) {
  return <Suspense fallback={<div className="editor-skeleton" aria-label="Loading editor" aria-busy="true" />}><RichEditor {...props} /></Suspense>
}
export function BlockEditorDialog({ open, onClose, title, value, onChange, max = 10000 }: { open: boolean; onClose: () => void; title: string; value: string; onChange: (v: string) => void; max?: number }) {
  return <Dialog open={open} onClose={onClose} title={title} wide>{open && <DocumentEditor label={title} value={value} onChange={onChange} max={max} />}<div className="st-row"><Button onClick={onClose}>Done</Button></div></Dialog>
}
export function BlockPreview({ value, empty }: { value: string; empty: string }) {
  const blocks = numberHeadings(parseFormatted(value))
  return blocks.length ? <div className="be-prev"><Blocks blocks={blocks} /></div> : <p className="hint">{empty}</p>
}
