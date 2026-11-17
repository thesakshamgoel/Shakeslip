import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Extension } from '@tiptap/core'
import { DOMParser as ProseParser, Slice } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import { Bold, Copy, Heading2, Heading3, IndentIncrease, IndentDecrease, List, ListOrdered, Pilcrow, Redo2, Undo2, Underline, Upload, Info } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, IconButton } from '../Button'
import { documentText, readDocument, writeDocument } from '../../lib/richText'
import { cleanImport, importDocument, DocumentImportError } from './importDocument'

export default function RichEditor({ value, onChange, max = 10000, label = 'Document' }: { value: string; onChange: (value: string) => void; max?: number; label?: string }) {
  const current = useRef(value), change = useRef(onChange)
  change.current = onChange
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [, render] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const limit = useRef(max); limit.current = max
  const editor = useEditor({
    extensions: [StarterKit.configure({ italic: false, link: false, code: false, codeBlock: false, horizontalRule: false, heading: { levels: [2, 3] } }), Extension.create({ name: 'documentLimit', addProseMirrorPlugins() { return [new Plugin({ filterTransaction(tr) { if (!tr.docChanged) return true; const ok = tr.doc.textContent.length <= limit.current && JSON.stringify(tr.doc.toJSON()).length <= 110000; if (!ok) queueMicrotask(() => setError(`This document is too long. Keep it within ${limit.current.toLocaleString('en-IN')} characters.`)); return ok } })] } })],
    content: readDocument(value),
    editorProps: { attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': label, class: 'rich-page' }, transformPastedHTML: cleanImport, handlePaste(view, event) {
      const html = event.clipboardData?.getData('text/html'), text = event.clipboardData?.getData('text/plain') ?? ''
      if (!html && !text.includes('\n')) return false
      event.preventDefault()
      let doc
      if (html) { const holder = document.createElement('div'); holder.innerHTML = cleanImport(html); doc = ProseParser.fromSchema(view.state.schema).parse(holder) }
      else doc = view.state.schema.nodeFromJSON(readDocument(text))
      view.dispatch(view.state.tr.replaceSelection(new Slice(doc.content, 0, 0)).scrollIntoView())
      return true
    } },
    onUpdate: ({ editor: e }) => { const next = writeDocument(e.getJSON()); current.current = next; change.current(next); setError(''); setCopied(false) },
    onTransaction: () => render((n) => n + 1),
  })
  useEffect(() => { if (editor && value !== current.current) { current.current = value; editor.commands.setContent(readDocument(value), { emitUpdate: false }) } }, [editor, value])
  if (!editor) return <div className="editor-skeleton" aria-busy="true" />
  const run = (fn: () => void) => { setError(''); fn() }
  const tools = [
    { name: 'Paragraph', icon: Pilcrow, active: editor.isActive('paragraph'), fn: () => editor.chain().focus().setParagraph().run() },
    { name: 'Heading', icon: Heading2, active: editor.isActive('heading', { level: 2 }), fn: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { name: 'Subheading', icon: Heading3, active: editor.isActive('heading', { level: 3 }), fn: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { name: 'Bold', icon: Bold, active: editor.isActive('bold'), fn: () => editor.chain().focus().toggleBold().run() },
    { name: 'Underline', icon: Underline, active: editor.isActive('underline'), fn: () => editor.chain().focus().toggleUnderline().run() },
    { name: 'Bullet list', icon: List, active: editor.isActive('bulletList'), fn: () => editor.chain().focus().toggleBulletList().run() },
    { name: 'Numbered list', icon: ListOrdered, active: editor.isActive('orderedList'), fn: () => editor.chain().focus().toggleOrderedList().run() },
  ]
  async function upload(file?: File) {
    if (!file || busy || !editor) return
    setBusy(true); setError('')
    try {
      const html = await importDocument(file)
      if (!html.trim()) throw new DocumentImportError('No readable text was found. Try copying and pasting the document instead.')
      editor.chain().focus().insertContentAt(editor.state.doc.content.size, html).run()
    } catch (e) { setError(e instanceof DocumentImportError ? e.message : 'This document could not be imported. Try copying and pasting its text.') }
    finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  return <div className="rich-editor">
    <div className="rich-toolbar" role="toolbar" aria-label={`${label} formatting`}>
      {tools.map(({ name, icon: Icon, active, fn }) => <IconButton key={name} type="button" label={name} aria-pressed={active} onMouseDown={(e) => e.preventDefault()} onClick={() => run(fn)}><Icon size={18} /></IconButton>)}
      <IconButton type="button" label="Indent list" disabled={!editor.can().sinkListItem('listItem')} onClick={() => editor.chain().focus().sinkListItem('listItem').run()}><IndentIncrease size={18} /></IconButton>
      <IconButton type="button" label="Outdent list" disabled={!editor.can().liftListItem('listItem')} onClick={() => editor.chain().focus().liftListItem('listItem').run()}><IndentDecrease size={18} /></IconButton>
      <IconButton type="button" label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={18} /></IconButton>
      <IconButton type="button" label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={18} /></IconButton>
      <Button type="button" disabled={busy} onClick={() => input.current?.click()}><Upload size={16} />{busy ? 'Importing…' : 'Import'}</Button>
      <Button type="button" onClick={async () => { try { if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([editor.getHTML()], { type: 'text/html' }), 'text/plain': new Blob([editor.getText()], { type: 'text/plain' }) })]); else await navigator.clipboard.writeText(editor.getText()); setCopied(true) } catch { setError('Copy is unavailable here. Select the text and use your device’s Copy command.') } }}><Copy size={16} />{copied ? 'Copied' : 'Copy'}</Button>
      <input hidden ref={input} type="file" accept=".docx,.txt" onChange={(e) => void upload(e.target.files?.[0])} />
    </div>
    <details className="import-help"><summary><Info size={16} aria-hidden />What imports best?</summary><p>Word .docx with heading and list styles works best. Import adds text at the end. Copy and paste from Word or Google Docs also keeps supported formatting. Fonts and colours follow your invoice design. Tables become text; images are omitted. For PDFs, paste selectable text and check the line breaks. Scanned PDFs and .doc files are not supported. Maximum file size: 2 MB.</p></details>
    {error && <p role="alert" className="au-err">{error}</p>}
    <EditorContent editor={editor} />
    <div className="rich-footer"><small>Use {'{client}'}, {'{total}'} and {'{due_date}'} for invoice details.</small><small className="num">{documentText(editor.getJSON()).length.toLocaleString('en-IN')} / {max.toLocaleString('en-IN')}</small></div>
  </div>
}
