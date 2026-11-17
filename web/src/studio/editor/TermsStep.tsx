import { FileText, Save, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { DocumentEditor } from '../../components/BlockEditor'
import { Select } from '../../components/Select'
import { Dialog } from '../../components/Dialog'
import { Field } from '../../components/Field'
import { CLAUSES, clauseTitle, groupTerms, suggestClauses, type ClauseContext } from '../../lib/clauses'
import { ANNEX_TEMPLATES } from '../../lib/annexures'
import { appendDocument, readDocument, writeDocument } from '../../lib/richText'
import { del, post, errText } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useToast } from '../../lib/toast'
import type { Draft } from './state'

type Template = { id: string; name: string; kind: 'terms' | 'annex'; content: string }
export function TermsStep({ d, set, ctx, profession, setAuto, markGenerated }: { d: Draft; set: (p: Partial<Draft>, m?: string) => void; ctx: ClauseContext; profession: string; services: string[]; auto: boolean; setAuto: (v: boolean) => void; markGenerated: () => void }) {
  const [tab, setTab] = useState<'terms' | 'annex'>('terms')
  const [name, setName] = useState(''), [saveOpen, setSaveOpen] = useState(false), [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState(''), [remove, setRemove] = useState(false)
  const templates = useApi<Template[]>('/studio/document-templates')
  const toast = useToast()
  // Existing suggested clauses are shown in the same document, without changing saved drafts until edited.
  const legacy = groupTerms(d.terms).map((g) => `# ${g.label}\n${g.items.map((t) => `- ${t}`).join('\n')}`).join('\n')
  const terms = legacy ? appendDocument(legacy, d.extra.customTerms) : d.extra.customTerms
  const value = tab === 'terms' ? terms : d.extra.annexure
  function update(text: string) {
    setAuto(false)
    if (tab === 'terms') set({ terms: [], extra: { ...d.extra, customTerms: text } }, 'terms-document')
    else set({ extra: { ...d.extra, annexure: text } }, 'annex-document')
  }
  const add = (text: string, generated = false) => { update(appendDocument(value, text)); if (generated) markGenerated() }
  async function save() {
    if (busy || !name.trim() || !value.trim()) return
    setBusy(true)
    try { await post('/studio/document-templates', { name: name.trim(), kind: tab, content: writeDocument(readDocument(value)) }); await templates.reload(); setSaveOpen(false); setName(''); toast.ok('Template saved for future invoices.') } catch (e) { toast.bad(errText(e)) } finally { setBusy(false) }
  }
  return <div className="terms-workspace">
    <div className="st-row"><div><h3>Write your terms and annexure</h3><p className="hint">Edit everything in one document. Suggestions and templates are starting points.</p></div></div>
    <div className="terms-tabs" role="tablist" aria-label="Invoice documents">{(['terms', 'annex'] as const).map((t) => <Button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setSelected('') }}>{t === 'terms' ? 'Terms & conditions' : 'Annexure'}</Button>)}</div>
    <div className="template-tools">
      <Select label="Saved templates" value={selected} onChange={setSelected} options={[{ value: '', label: 'Choose a template' }, ...(templates.data ?? []).filter((t) => t.kind === tab).map((t) => ({ value: t.id, label: t.name }))]} />
      <Button disabled={!selected} onClick={() => { const t = templates.data?.find((x) => x.id === selected); if (t) add(t.content) }}>Insert template</Button>
      <Button disabled={!value.trim()} onClick={() => setSaveOpen(true)}><Save size={16} />Save as template</Button>
      {selected && <Button variant="danger" onClick={() => setRemove(true)}>Delete template</Button>}
    </div>
    <DocumentEditor key={tab} label={tab === 'terms' ? 'Terms document' : 'Annexure document'} value={value} onChange={update} max={tab === 'terms' ? 10000 : 6000} />
    <details className="terms-options"><summary>{tab === 'terms' ? 'Suggested clauses' : 'Annexure starting points'}</summary>
      {tab === 'terms' ? <>
        <Button onClick={() => add(suggestClauses({ advance: d.advance, dueDays: ctx.dueDays, profession, plan: d.extra.plan.kind }).map((t) => `- ${t}`).join('\n'), true)}><Sparkles size={16} />Insert suggested terms</Button>
        {CLAUSES.map((g) => <div className="cg" key={g.id}><h4>{g.label}</h4><div className="chips2">{g.clauses.map((c) => <Button key={c.id} onClick={() => add(`- ${c.text}`, true)}>{clauseTitle(c)}</Button>)}</div></div>)}
      </> : <><Button onClick={() => add(`# Scope of work\n${d.items.filter((i) => i.desc.trim()).map((i) => `- ${i.desc}`).join('\n')}`, true)}><FileText size={16} />Insert from scope</Button><div className="chips2">{ANNEX_TEMPLATES.map((a) => <Button key={a.id} onClick={() => add(a.text, true)}>{a.label}</Button>)}</div></>}
    </details>
    <details className="terms-options"><summary>Page options</summary><label className="switch-row"><span><b>Include terms page</b><small>Annexure prints when it contains text.</small></span><input type="checkbox" role="switch" checked={d.extra.showTerms !== false} onChange={(e) => set({ extra: { ...d.extra, showTerms: e.target.checked } })} /></label></details>
    <Dialog open={saveOpen} onClose={() => { if (!busy) setSaveOpen(false) }} title="Save a writing template"><Field label="Template name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /><Button variant="primary" disabled={busy || !name.trim()} onClick={() => void save()}>{busy ? 'Saving' : 'Save template'}</Button></Dialog>
    <Dialog open={remove} onClose={() => { if (!busy) setRemove(false) }} title="Delete this template?"><p>Existing invoices keep their text. This template will no longer be available for new invoices.</p><div className="st-row"><Button onClick={() => setRemove(false)}>Keep template</Button><Button variant="danger" disabled={busy} onClick={async () => { if (busy) return; setBusy(true); try { await del(`/studio/document-templates/${selected}`); setSelected(''); setRemove(false); await templates.reload() } catch (e) { toast.bad(errText(e)) } finally { setBusy(false) } }}>Delete template</Button></div></Dialog>
  </div>
}
