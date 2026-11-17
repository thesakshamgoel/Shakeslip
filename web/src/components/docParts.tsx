import type { ReactNode } from 'react'
import { RICH_PREFIX, readDocument, type RichNode } from '../lib/richText'
import { fillClause, groupTerms, type ClauseContext } from '../lib/clauses'

/* Turns the terms (library clauses, custom text) and the annexure into page-sized blocks. */
export type Block = { k: 'h' | 'li' | 'p' | 'sub' | 'sub2' | 'num'; text: string; b?: boolean; runs?: { text: string; bold?: boolean; underline?: boolean; strike?: boolean }[]; depth?: number; number?: number }

/* Light formatting stored as plain text, written by the editor so people never type the marks:
   "# Heading", "## Subheading", "- point", "1. numbered point", "!! " in front for bold. */
export function parseFormatted(src: string): Block[] {
  if (src.startsWith(RICH_PREFIX)) {
    const blocks: Block[] = []
    function inline(n: RichNode): NonNullable<Block['runs']> { return n.type === 'text' ? [{ text: n.text ?? '', bold: n.marks?.some((m) => m.type === 'bold'), underline: n.marks?.some((m) => m.type === 'underline'), strike: n.marks?.some((m) => m.type === 'strike') }] : n.type === 'hardBreak' ? [{ text: '\n' }] : (n.content ?? []).flatMap(inline) }
    function walk(n: RichNode, kind?: 'li' | 'num', depth = 0, number?: number) {
      if (n.type === 'paragraph' || n.type === 'heading') { const runs = inline(n); blocks.push({ k: n.type === 'heading' ? (Number(n.attrs?.level) <= 2 ? 'sub' : 'sub2') : kind ?? 'p', text: runs.map((r) => r.text).join(''), runs, depth, number }); return }
      if (n.type === 'bulletList' || n.type === 'orderedList') { for (const [i, item] of (n.content ?? []).entries()) walk(item, n.type === 'bulletList' ? 'li' : 'num', depth + 1, n.type === 'orderedList' ? Number(n.attrs?.start ?? 1) + i : undefined); return }
      for (const child of n.content ?? []) walk(child, kind, depth, number)
    }
    walk(readDocument(src)); return blocks
  }
  return src.split('\n').map((l) => l.trim()).filter(Boolean).map((raw): Block => {
    const b = /^!!\s+/.test(raw), l = raw.replace(/^!!\s+/, '')
    const base: Block = /^##\s+/.test(l) ? { k: 'sub2', text: l.replace(/^##\s+/, '') } : /^#\s+/.test(l) ? { k: 'sub', text: l.replace(/^#\s+/, '') }
      : /^[-•*]\s+/.test(l) ? { k: 'li', text: l.replace(/^[-•*]\s+/, '') } : /^\d+[.)]\s+/.test(l) ? { k: 'num', text: l.replace(/^\d+[.)]\s+/, '') } : { k: 'p', text: l }
    return b ? { ...base, b } : base
  })
}

/* Headings are numbered in order, so a reader can point to "clause 3". */
export function numberHeadings(blocks: Block[], start = 0): Block[] {
  let n = start
  return blocks.map((x) => (x.k === 'sub' ? { ...x, text: `${++n}. ${x.text}`, runs: x.runs ? [{ text: `${n}. ` }, ...x.runs] : undefined } : x))
}

export function termBlocks(terms: string[], custom: string, ctx: ClauseContext): Block[] {
  const out: Block[] = []
  const groups = groupTerms(terms)
  groups.forEach((g, i) => { out.push({ k: 'h', text: `${i + 1}. ${g.label}` }); g.items.forEach((t) => out.push({ k: 'li', text: fillClause(t, ctx) })) })
  if (custom.trim()) {
    const own = formattedBlocks(custom, ctx)
    if (own.some((x) => x.k === 'sub')) out.push(...numberHeadings(own, groups.length))
    else { out.push({ k: 'h', text: `${groups.length + 1}. Additional terms` }); out.push(...own) }
  }
  return out
}

const COST: Record<Block['k'], number> = { h: 160, sub: 130, sub2: 100, li: 70, num: 70, p: 60 }
export function paginate(blocks: Block[], budget: number): Block[][] {
  const pages: Block[][] = []
  let cur: Block[] = [], used = 0
  blocks = blocks.flatMap((b) => splitLongBlock(b, Math.min(2200, budget - 200)))
  blocks.forEach((b, i) => {
    const c = b.text.length + COST[b.k]
    const orphanHeading = (b.k === 'h' || b.k === 'sub') && i < blocks.length - 1 && used + c + blocks[i + 1].text.length + 70 > budget
    if (cur.length && (used + c > budget || orphanHeading)) { pages.push(cur); cur = []; used = 0 }
    cur.push(b); used += c
  })
  if (cur.length) pages.push(cur)
  return pages
}

function sliceRuns(runs: NonNullable<Block['runs']>, start: number, end: number) {
  let offset = 0
  return runs.flatMap((r) => { const from = Math.max(0, start - offset), to = Math.min(r.text.length, end - offset); offset += r.text.length; return to > from ? [{ ...r, text: r.text.slice(from, to) }] : [] })
}
function splitLongBlock(b: Block, limit: number): Block[] {
  if (b.text.length <= limit) return [b]
  const parts: Block[] = []
  let start = 0
  while (start < b.text.length) {
    let end = Math.min(start + limit, b.text.length)
    if (end < b.text.length) { const space = b.text.lastIndexOf(' ', end); if (space > start + limit / 2) end = space + 1 }
    parts.push({ ...b, k: start ? 'p' : b.k, text: b.text.slice(start, end), runs: b.runs ? sliceRuns(b.runs, start, end) : undefined })
    start = end
  }
  return parts
}
export function formattedBlocks(src: string, ctx: ClauseContext) {
  return parseFormatted(src).map((b) => {
    if (!b.runs) return { ...b, text: fillClause(b.text, ctx) }
    const runs: NonNullable<Block['runs']> = []
    let at = 0
    // Tokens can cross formatting boundaries (for example bold inside {client}).
    for (const match of b.text.matchAll(/\{[^{}]+\}/g)) {
      const index = match.index!
      runs.push(...sliceRuns(b.runs, at, index))
      runs.push({ ...sliceRuns(b.runs, index, index + 1)[0], text: fillClause(match[0], ctx) })
      at = index + match[0].length
    }
    runs.push(...sliceRuns(b.runs, at, b.text.length))
    return { ...b, text: runs.map((r) => r.text).join(''), runs }
  })
}
const T = (b: Block) => b.runs ? b.runs.map((r, i) => <span key={i} style={{ fontWeight: r.bold ? 700 : undefined, textDecoration: [r.underline && 'underline', r.strike && 'line-through'].filter(Boolean).join(' ') || undefined, whiteSpace: 'pre-wrap' }}>{r.text}</span>) : (b.b ? <strong>{b.text}</strong> : b.text)
export function Blocks({ blocks }: { blocks: Block[] }) {
  const out: ReactNode[] = []
  let list: Block[] = [], kind: 'li' | 'num' | '' = ''
  const flush = (key: number) => {
    if (!list.length) return
    const items = list.map((x, i) => <li key={i} value={x.number} style={{ marginLeft: Math.max(0, (x.depth ?? 1) - 1) * 16 }}>{T(x)}</li>)
    out.push(kind === 'num' ? <ol key={`l${key}`} className="d-ul d-ol">{items}</ol> : <ul key={`l${key}`} className="d-ul">{items}</ul>)
    list = []; kind = ''
  }
  blocks.forEach((b, i) => {
    if (b.k === 'li' || b.k === 'num') { if (kind && kind !== b.k) flush(i); kind = b.k; list.push(b); return }
    flush(i)
    out.push(b.k === 'h' ? <h3 key={i} className="d-th">{b.text}</h3> : b.k === 'sub' ? <h3 key={i} className="d-th">{T(b)}</h3> : b.k === 'sub2' ? <h4 key={i} className="d-tsub">{T(b)}</h4> : <p key={i} className="d-tp">{T(b)}</p>)
  })
  flush(blocks.length)
  return <>{out}</>
}
