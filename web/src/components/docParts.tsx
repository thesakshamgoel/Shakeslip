import type { ReactNode } from 'react'
import { fillClause, groupTerms, type ClauseContext } from '../lib/clauses'

/* Turns the terms (library clauses, custom text) and the annexure into page-sized blocks. */
export type Block = { k: 'h' | 'li' | 'p' | 'sub' | 'sub2' | 'num'; text: string; b?: boolean }

/* Light formatting stored as plain text, written by the editor so people never type the marks:
   "# Heading", "## Subheading", "- point", "1. numbered point", "!! " in front for bold. */
export function parseFormatted(src: string): Block[] {
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
  return blocks.map((x) => (x.k === 'sub' ? { ...x, text: `${++n}. ${x.text}` } : x))
}

export function termBlocks(terms: string[], custom: string, ctx: ClauseContext): Block[] {
  const out: Block[] = []
  const groups = groupTerms(terms)
  groups.forEach((g, i) => { out.push({ k: 'h', text: `${i + 1}. ${g.label}` }); g.items.forEach((t) => out.push({ k: 'li', text: fillClause(t, ctx) })) })
  if (custom.trim()) {
    const own = parseFormatted(fillClause(custom, ctx))
    if (own.some((x) => x.k === 'sub')) out.push(...numberHeadings(own, groups.length))
    else { out.push({ k: 'h', text: `${groups.length + 1}. Additional terms` }); out.push(...own) }
  }
  return out
}

const COST: Record<Block['k'], number> = { h: 160, sub: 130, sub2: 100, li: 70, num: 70, p: 60 }
export function paginate(blocks: Block[], budget: number): Block[][] {
  const pages: Block[][] = []
  let cur: Block[] = [], used = 0
  blocks.forEach((b, i) => {
    const c = b.text.length + COST[b.k]
    const orphanHeading = (b.k === 'h' || b.k === 'sub') && i < blocks.length - 1 && used + c + blocks[i + 1].text.length + 70 > budget
    if (cur.length && (used + c > budget || orphanHeading)) { pages.push(cur); cur = []; used = 0 }
    cur.push(b); used += c
  })
  if (cur.length) pages.push(cur)
  return pages
}

const T = (b: Block) => (b.b ? <strong>{b.text}</strong> : b.text)
export function Blocks({ blocks }: { blocks: Block[] }) {
  const out: ReactNode[] = []
  let list: Block[] = [], kind: 'li' | 'num' | '' = ''
  const flush = (key: number) => {
    if (!list.length) return
    const items = list.map((x, i) => <li key={i}>{T(x)}</li>)
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
