import { expect, test } from 'bun:test'
import { appendDocument, documentText, readDocument, RICH_PREFIX, writeDocument } from '../../web/src/lib/richText'
import { formattedBlocks, paginate, parseFormatted } from '../../web/src/components/docParts'
import type { ClauseContext } from '../../web/src/lib/clauses'

test('legacy terms retain headings, lists and bold in the continuous editor', () => {
  const doc = readDocument('# Payment\n!! Pay in advance\n- First item\n- Second item\n1. Numbered')
  const blocks = parseFormatted(writeDocument(doc))
  expect(blocks.map(x => x.k)).toEqual(['sub', 'p', 'li', 'li', 'num'])
  expect(blocks[1].runs?.[0].bold).toBe(true)
  expect(documentText(readDocument(appendDocument(writeDocument(doc), '# Scope\nMore text')))).toContain('More text')
})

test('tokens survive formatting boundaries and punctuation in names', () => {
  const value = writeDocument({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello {cli', marks: [{ type: 'bold' }] }, { type: 'text', text: 'ent}.' }] }] })
  const blocks = formattedBlocks(value, { client: 'A "quoted" client' } as unknown as ClauseContext)
  expect(blocks[0].text).toContain('A "quoted" client')
  expect(blocks[0].runs?.map(x => x.text).join('')).toBe(blocks[0].text)
})

test('long rich paragraphs paginate without losing text or formatting', () => {
  const text = 'A long paragraph with a bold portion. '.repeat(240)
  const value = writeDocument({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text, marks: [{ type: 'bold' }] }] }] })
  const pages = paginate(parseFormatted(value), 4600)
  expect(pages.length).toBeGreaterThan(1)
  expect(pages.flat().map(x => x.text).join('')).toBe(text)
  expect(pages.flat().every(x => x.runs?.every(r => r.bold))).toBe(true)
})

test('stored document trees allow only supported nodes and marks', () => {
  const doc = readDocument(RICH_PREFIX + JSON.stringify({ type: 'doc', content: [{ type: 'script', text: 'bad' }, { type: 'paragraph', content: [{ type: 'text', text: 'Safe', marks: [{ type: 'link', attrs: { href: 'javascript:bad' } }, { type: 'bold' }] }] }] }))
  expect(documentText(doc)).toBe('Safe')
  expect(doc.content?.[0].content?.[0].marks).toEqual([{ type: 'bold' }])
})
