import { ArrowDown, ArrowUp, Bold, Heading2, Heading3, List, ListOrdered, Plus, Pilcrow, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, IconButton } from './Button'
import { Dialog } from './Dialog'
import { numberHeadings, parseFormatted, type Block } from './docParts'
import './blockeditor.css'

type Kind = 'sub' | 'sub2' | 'li' | 'num' | 'p'
type Row = { id: number; k: Kind; text: string; b?: boolean }
let uid = 1
const toRows = (src: string): Row[] => parseFormatted(src).map((x) => ({ id: uid++, k: x.k === 'h' ? 'sub' : x.k, text: x.text, b: x.b }))
/* stored as plain text with a light marker, so older invoices and the server keep working; people never see the markers */
const MARK: Record<Kind, string> = { sub: '# ', sub2: '## ', li: '- ', num: '1. ', p: '' }
const toText = (rows: Row[]) => rows.filter((r) => r.text.trim()).map((r) => `${r.b ? '!! ' : ''}${MARK[r.k]}${r.text.trim()}`).join('\n')
const TYPES = [{ k: 'sub', label: 'Heading', Icon: Heading2 }, { k: 'sub2', label: 'Subheading', Icon: Heading3 }, { k: 'li', label: 'Point', Icon: List }, { k: 'num', label: 'Numbered', Icon: ListOrdered }, { k: 'p', label: 'Text', Icon: Pilcrow }] as const
const NAME: Record<Kind, string> = { sub: 'Heading', sub2: 'Subheading', li: 'Point', num: 'Numbered point', p: 'Text' }
/* what shows in the margin: heading numbers and list numbers count up by themselves */
function labels(rows: Row[]): string[] { let h = 0, n = 0; return rows.map((r) => { if (r.k === 'sub') { n = 0; return `${++h}.` } if (r.k === 'num') return `${++n}.`; if (r.k !== 'sub2') n = r.k === 'li' ? 0 : n; return '' }) }

function Line({ r, label, active, onFocus, onChange, onKey }: { r: Row; label: string; active: boolean; onFocus: () => void; onChange: (t: string) => void; onKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void }) {
  const el = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { if (el.current) { el.current.style.height = 'auto'; el.current.style.height = `${el.current.scrollHeight}px` } }, [r.text])
  return (
    <div className={`be-row be-${r.k} ${r.b ? 'be-b' : ''} ${active ? 'on' : ''}`}>
      <span className="be-mark" aria-hidden>{label}</span>
      <textarea ref={el} data-row={r.id} rows={1} value={r.text} maxLength={600} aria-label={NAME[r.k]}
        placeholder={r.k === 'p' ? 'Write here' : NAME[r.k]} onFocus={onFocus} onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))} onKeyDown={onKey} />
    </div>
  )
}

/* A big editor for terms and annexures. Headings, points and text are buttons, no # or - needed. */
export function BlockEditorDialog({ open, onClose, title, value, onChange, max = 10000 }: { open: boolean; onClose: () => void; title: string; value: string; onChange: (v: string) => void; max?: number }) {
  const [rows, setRows] = useState<Row[]>(() => toRows(value))
  const [at, setAt] = useState(0)
  const last = useRef(value)
  useEffect(() => { if (open && value !== last.current) { setRows(toRows(value)); last.current = value } }, [open, value])
  /* an empty editor starts with one heading line; functional update so it never replaces text that was just loaded */
  useEffect(() => { if (open) setRows((r) => (r.length ? r : [{ id: uid++, k: 'sub', text: '' }])) }, [open, rows.length])
  const commit = (next: Row[]) => { setRows(next); const t = toText(next); if (t.length <= max) { last.current = t; onChange(t) } }
  const focus = (id: number) => requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(`textarea[data-row="${id}"]`)?.focus())
  const add = (i: number, k: Kind = 'p') => { const r = { id: uid++, k, text: '' }; commit([...rows.slice(0, i + 1), r, ...rows.slice(i + 1)]); setAt(i + 1); focus(r.id) }
  const setBold = () => commit(rows.map((r, i) => (i === at ? { ...r, b: !r.b } : r)))
  const setType = (k: Kind) => commit(rows.map((r, i) => (i === at ? { ...r, k } : r)))
  const move = (d: number) => { const j = at + d; if (j < 0 || j >= rows.length) return; const n = [...rows]; [n[at], n[j]] = [n[j], n[at]]; commit(n); setAt(j) }
  const del = () => { if (rows.length <= 1) { commit([{ ...rows[0], text: '' }]); return } const n = rows.filter((_, i) => i !== at); commit(n); setAt(Math.max(0, at - 1)); focus(n[Math.max(0, at - 1)].id) }
  function key(i: number, e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const r = rows[i]
    if (e.key === 'Enter') { e.preventDefault(); if (!r.text.trim() && (r.k === 'li' || r.k === 'num')) { commit(rows.map((x, j) => (j === i ? { ...x, k: 'p' } : x))); return } add(i, r.k === 'li' || r.k === 'num' ? r.k : 'p') }
    if (e.key === 'Backspace' && !r.text) { e.preventDefault(); if (r.k === 'li' || r.k === 'num') commit(rows.map((x, j) => (j === i ? { ...x, k: 'p' } : x))); else if (rows.length > 1) { const n = rows.filter((_, j) => j !== i); commit(n); setAt(Math.max(0, i - 1)); focus(n[Math.max(0, i - 1)].id) } }
  }
  const used = toText(rows).length
  const lab = labels(rows)
  return (
    <Dialog open={open} onClose={onClose} title={title} wide>
      <div className="be">
        <div className="be-bar" role="toolbar" aria-label="Formatting">
          <div className="be-grp" role="radiogroup" aria-label="Line type">
            {TYPES.map(({ k, label, Icon }) => <button key={k} type="button" role="radio" aria-checked={rows[at]?.k === k} className="be-btn tap" onClick={() => setType(k)}><Icon size={16} aria-hidden />{label}</button>)}
          </div>
          <div className="be-grp">
            <button type="button" className="be-btn tap" aria-pressed={!!rows[at]?.b} onClick={setBold}><Bold size={16} aria-hidden />Bold</button>
            <Button onClick={() => add(at, rows[at]?.k === 'li' || rows[at]?.k === 'num' ? rows[at].k : 'p')}><Plus size={16} aria-hidden />Add line</Button>
            <IconButton label="Move line up" disabled={at === 0} onClick={() => move(-1)}><ArrowUp size={16} /></IconButton>
            <IconButton label="Move line down" disabled={at >= rows.length - 1} onClick={() => move(1)}><ArrowDown size={16} /></IconButton>
            <IconButton label="Delete line" onClick={del}><Trash2 size={16} /></IconButton>
          </div>
        </div>
        <div className="be-page">{rows.map((r, i) => <Line key={r.id} r={r} label={lab[i]} active={i === at} onFocus={() => setAt(i)} onChange={(t) => commit(rows.map((x, j) => (j === i ? { ...x, text: t } : x)))} onKey={(e) => key(i, e)} />)}</div>
        <div className="be-foot"><small className="num">{used.toLocaleString('en-IN')} of {max.toLocaleString('en-IN')} characters. Names and amounts can be typed as {'{client}'}, {'{total}'}, {'{due_date}'}.</small><Button variant="primary" onClick={onClose}>Done</Button></div>
      </div>
    </Dialog>
  )
}

/* The written terms as they will read, with the button that opens the editor. */
export function BlockPreview({ value, empty }: { value: string; empty: string }) {
  const blocks: Block[] = numberHeadings(parseFormatted(value))
  if (!blocks.length) return <p className="hint">{empty}</p>
  return (
    <div className="be-prev">
      {blocks.map((b, i) => b.k === 'sub' ? <h4 key={i}>{b.text}</h4> : b.k === 'sub2' ? <h5 key={i}>{b.text}</h5> : b.k === 'li' || b.k === 'num' ? <p key={i} className="li">{b.text}</p> : <p key={i}>{b.text}</p>)}
    </div>
  )
}
