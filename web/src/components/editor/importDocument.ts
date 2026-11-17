export class DocumentImportError extends Error {}
/** Only semantic text formatting enters the editor: no URLs, images, styles or executable markup. */
export function cleanImport(html: string): string {
  const source = new DOMParser().parseFromString(html, 'text/html')
  const output = document.implementation.createHTMLDocument('')
  const allowed = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'STRONG', 'B', 'U', 'S', 'STRIKE', 'BR', 'BLOCKQUOTE'])
  const blocked = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'IMG', 'VIDEO', 'AUDIO'])
  function copy(node: Node, parent: Node) {
    if (node.nodeType === Node.TEXT_NODE) { parent.appendChild(output.createTextNode(node.textContent ?? '')); return }
    if (!(node instanceof Element) || blocked.has(node.tagName)) return
    let tag = node.tagName
    if (tag === 'H1') tag = 'H2'
    if (tag === 'H4') tag = 'H3'
    if (['DIV', 'TR'].includes(tag)) tag = 'P'
    const el = allowed.has(tag) ? output.createElement(tag.toLowerCase()) : null
    let target = el ?? parent
    const style = (node as HTMLElement).style
    if (style && (style.fontWeight === 'bold' || Number(style.fontWeight) >= 600)) { const strong = output.createElement('strong'); target.appendChild(strong); target = strong }
    if (style?.textDecoration?.includes('underline')) { const underline = output.createElement('u'); target.appendChild(underline); target = underline }
    for (const child of node.childNodes) copy(child, target)
    if (el) parent.appendChild(el)
    if (tag === 'TD' || tag === 'TH') parent.appendChild(output.createTextNode('  '))
  }
  for (const node of source.body.childNodes) copy(node, output.body)
  return output.body.innerHTML
}
export async function importDocument(file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) throw new DocumentImportError('Choose a document smaller than 2 MB.')
  if (/\.txt$/i.test(file.name)) {
    const holder = document.createElement('div')
    for (const line of (await file.text()).split(/\r?\n/)) { const p = document.createElement('p'); p.textContent = line; holder.append(p) }
    return holder.innerHTML
  }
  if (!/\.docx$/i.test(file.name)) throw new DocumentImportError('Use a Word .docx or plain text .txt file. For PDFs, copy and paste the text, then review it.')
  const arrayBuffer = await file.arrayBuffer()
  validateDocxArchive(arrayBuffer)
  const { default: mammoth } = await import('mammoth')
  const result = await mammoth.convertToHtml({ arrayBuffer }, { externalFileAccess: false, includeEmbeddedStyleMap: false, convertImage: mammoth.images.imgElement(async () => ({ src: '' })) })
  return cleanImport(result.value)
}

// Check archive expansion before handing a DOCX to the converter.
function validateDocxArchive(buffer: ArrayBuffer) {
  const data = new DataView(buffer)
  let end = -1
  for (let i = data.byteLength - 22; i >= Math.max(0, data.byteLength - 65557); i--) if (data.getUint32(i, true) === 0x06054b50) { end = i; break }
  if (end < 0) throw new DocumentImportError('This is not a readable Word .docx file. Export it as .docx and try again.')
  const count = data.getUint16(end + 10, true)
  let at = data.getUint32(end + 16, true), expanded = 0
  if (count > 500) throw new DocumentImportError('This document is too complex to import. Copy and paste its text instead.')
  for (let i = 0; i < count; i++) {
    if (at + 46 > data.byteLength || data.getUint32(at, true) !== 0x02014b50) throw new DocumentImportError('This document could not be read. Export a fresh .docx copy.')
    expanded += data.getUint32(at + 24, true)
    if (expanded > 16 * 1024 * 1024) throw new DocumentImportError('This document expands beyond the import limit. Remove images or paste its text instead.')
    at += 46 + data.getUint16(at + 28, true) + data.getUint16(at + 30, true) + data.getUint16(at + 32, true)
  }
}
