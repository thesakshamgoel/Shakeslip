/** A versioned, inert document tree. Never render stored or imported HTML. */
export type RichNode = { type: string; text?: string; attrs?: Record<string, unknown>; marks?: { type: string }[]; content?: RichNode[] }
export const RICH_PREFIX = 'ssdoc:1:'
export function readDocument(value: string): RichNode {
  if (value.startsWith(RICH_PREFIX)) {
    try { const doc = JSON.parse(value.slice(RICH_PREFIX.length)); if (doc.type === 'doc' && Array.isArray(doc.content)) return normalizeDocument(doc) } catch { /* legacy fallback */ }
  }
  const content: RichNode[] = []
  for (const raw of value.split('\n').filter((x) => x.trim())) {
    const bold = /^!!\s+/.test(raw), line = raw.replace(/^!!\s+/, '')
    const heading = /^(#{1,2})\s+/.exec(line), list = /^(?:[-•*]|\d+[.)])\s+/.exec(line)
    const text = line.replace(/^(?:#{1,2}|[-•*]|\d+[.)])\s+/, '')
    const paragraph: RichNode = { type: heading ? 'heading' : 'paragraph', ...(heading ? { attrs: { level: heading[1].length + 1 } } : {}), content: [{ type: 'text', text, ...(bold ? { marks: [{ type: 'bold' }] } : {}) }] }
    if (list) {
      const type = /^\d/.test(line) ? 'orderedList' : 'bulletList'
      const last = content.at(-1)
      const item = { type: 'listItem', content: [paragraph] }
      if (last?.type === type) last.content!.push(item)
      else content.push({ type, content: [item] })
    } else content.push(paragraph)
  }
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}
export const writeDocument = (doc: RichNode) => documentText(doc).trim() ? RICH_PREFIX + JSON.stringify(doc) : ''
export function documentText(node: RichNode): string {
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'hardBreak') return '\n'
  return (node.content ?? []).map(documentText).join(['doc', 'bulletList', 'orderedList', 'listItem'].includes(node.type) ? '\n' : '')
}
export function appendDocument(value: string, addition: string) {
  const first = readDocument(value), next = readDocument(addition)
  return writeDocument({ type: 'doc', content: [...(first.content ?? []), ...(next.content ?? [])] })
}

function normalizeDocument(value: unknown): RichNode {
  let count = 0
  const types = new Set(['doc', 'paragraph', 'heading', 'text', 'hardBreak', 'bulletList', 'orderedList', 'listItem', 'blockquote'])
  function node(raw: any, depth = 0): RichNode | null {
    if (++count > 10000 || depth > 20 || !raw || !types.has(raw.type)) return null
    if (raw.type === 'text') return typeof raw.text === 'string' && raw.text ? { type: 'text', text: raw.text, marks: Array.isArray(raw.marks) ? raw.marks.filter((m: any) => m && ['bold', 'underline', 'strike'].includes(m.type)).map((m: any) => ({ type: m.type })) : [] } : null
    return { type: raw.type, ...(raw.type === 'heading' ? { attrs: { level: Number(raw.attrs?.level) <= 2 ? 2 : 3 } } : raw.type === 'orderedList' ? { attrs: { start: Math.max(1, Math.min(10000, Number(raw.attrs?.start) || 1)) } } : {}), content: Array.isArray(raw.content) ? raw.content.map((v: unknown) => node(v, depth + 1)).filter(Boolean) : [] }
  }
  return node(value) ?? { type: 'doc', content: [{ type: 'paragraph' }] }
}
