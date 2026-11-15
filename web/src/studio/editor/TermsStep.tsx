import { AnimatePresence, motion } from 'motion/react'
import { Check, FileText, Pencil, PenLine, Plus, Sparkles, Wand2, X } from 'lucide-react'
import { useState } from 'react'
import { Button, IconButton } from '../../components/Button'
import { BlockEditorDialog, BlockPreview } from '../../components/BlockEditor'
import { Chip } from '../../components/Chip'
import { autoMatch, CLAUSES, clauseTitle, fillClause, groupTerms, suggestClauses, type ClauseContext } from '../../lib/clauses'
import { fmtDate } from '../../lib/dates'
import { springSoft } from '../../lib/motion'
import { splitPaste } from '../../lib/paste'
import type { Draft } from './state'
import { ANNEX_TEMPLATES } from '../../lib/annexures'

export function TermsStep({ d, set, ctx, profession, services, auto, setAuto, markGenerated }: { d: Draft; set: (p: Partial<Draft>, m?: string) => void; ctx: ClauseContext; profession: string; services: string[]; auto: boolean; setAuto: (v: boolean) => void; markGenerated: () => void }) {
  const [custom, setCustom] = useState('')
  const [edit, setEdit] = useState<'terms' | 'annex' | null>(null)
  const [at, setAt] = useState<number | null>(null)
  const [text, setText] = useState('')
  const has = (t: string) => d.terms.includes(t)
  const toggle = (t: string) => { setAuto(false); set({ terms: has(t) ? d.terms.filter((x) => x !== t) : [...d.terms, t] }) }
  const words = `${services.join(' ')} ${d.items.map((i) => i.desc).join(' ')}`
  const matched = autoMatch(words, d.extra.category)
  const ex = (p: Partial<Draft['extra']>) => set({ extra: { ...d.extra, ...p } })
  /* Moves the suggested clauses into the editor as headings and points, so every word can be changed.
     Names and amounts stay as {tokens}, so they keep filling in. Undo brings the clauses back. */
  function editAll() {
    const lib = groupTerms(d.terms).map((g) => [`# ${g.label}`, ...g.items.map((t) => `- ${t}`)].join('\n')).join('\n')
    setAuto(false)
    set({ terms: [], extra: { ...d.extra, customTerms: [lib, d.extra.customTerms.trim()].filter(Boolean).join('\n') } })
    setEdit('terms')
  }
  /* An annexure written from the scope: what is included, when, and how it is paid. */
  function writeAnnexure() {
    const lines = ['# Scope of work', ...d.items.filter((i) => i.desc.trim()).map((i) => `- ${i.desc}${i.qty !== 1 || i.unit ? ` (${i.qty}${i.unit ? ` ${i.unit}` : ''})` : ''}`)]
    if (d.extra.category || d.project) lines.push('# Deliverables', `- ${[d.extra.category, d.project].filter(Boolean).join(': ')}`)
    if (d.extra.completionDate) lines.push('# Timeline', `- Shoot or completion date: ${fmtDate(new Date(`${d.extra.completionDate}T09:00:00+05:30`).toISOString())}`)
    lines.push('# Not included', '- Anything not listed above is out of scope and will be quoted separately.')
    ex({ annexure: lines.join('\n') })
    markGenerated()
  }
  return (
    <div className="st">
      <div className="st-block">
        <label className="switch-row"><span><b>Terms page</b><small>Print the terms on their own page after the invoice</small></span><input type="checkbox" role="switch" checked={d.extra.showTerms !== false} onChange={(e) => ex({ showTerms: e.target.checked })} /></label>
        <div className="st-row"><h3>Terms and conditions</h3>
          <span className="st-acts">
            <Button onClick={() => { setAuto(true); set({ terms: [...new Set([...suggestClauses({ advance: d.advance, dueDays: ctx.dueDays, profession, plan: d.extra.plan.kind }), ...matched])] }) }}><Sparkles size={16} aria-hidden />Suggest</Button>
            <Button onClick={editAll} title="Opens one editor with every clause on this invoice, so you can change any word"><PenLine size={16} aria-hidden />Edit all in one place</Button>
            <Button disabled={!matched.length} onClick={() => set({ terms: [...new Set([...d.terms, ...matched])] })} title="Adds deliverable terms that match your services"><Wand2 size={16} aria-hidden />Match services</Button>
          </span>
        </div>
        {auto && d.terms.length > 0 && <p className="auto-note"><Sparkles size={14} aria-hidden />Suggested terms follow your plan, services and due date. Edit any clause to take over.</p>}
        <p className="hint">They print on their own page, grouped under headings. Names, amounts and dates fill in by themselves. Starting points, not legal advice.</p>
        {CLAUSES.map((g) => (
          <div key={g.id} className="cg">
            <small>{g.label}</small>
            <div className="chips2">{g.clauses.map((c) => <Chip key={c.id} on={has(c.text)} onClick={() => toggle(c.text)}>{clauseTitle(c)}</Chip>)}</div>
          </div>
        ))}
      </div>
      <div className="st-block">
        <h3>On this invoice <span className="count num">{d.terms.length}</span></h3>
        {!d.terms.length && <p className="hint">No clauses yet. Tap Suggest, or pick from above.</p>}
        <ol className="tl">
          <AnimatePresence initial={false}>
            {d.terms.map((t, i) => (
              <motion.li key={`${i}-${t}`} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8, transition: { duration: 0.14 } }} transition={springSoft}>
                {at === i
                  ? <div className="cl-edit"><textarea className="input" rows={3} value={text} maxLength={600} aria-label="Edit this clause" onChange={(e) => setText(e.target.value)} />
                    <small className="hint">Names and amounts fill in by themselves: {'{client}'}, {'{total}'}, {'{balance}'}, {'{due_date}'}.</small>
                    <div className="cl-acts"><Button variant="primary" disabled={!text.trim()} onClick={() => { setAuto(false); set({ terms: d.terms.map((x, j) => (j === i ? text.trim() : x)) }); setAt(null) }}><Check size={16} aria-hidden />Save clause</Button><Button variant="ghost" onClick={() => setAt(null)}>Cancel</Button></div></div>
                  : <><span>{fillClause(t, ctx)}</span><span className="cl-btns"><IconButton label="Edit this clause" onClick={() => { setAt(i); setText(t) }}><Pencil size={16} /></IconButton><IconButton label="Remove this clause" onClick={() => toggle(t)}><X size={16} /></IconButton></span></>}
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
        <form className="inline-add" onSubmit={(e) => { e.preventDefault(); const v = custom.trim(); if (v && !has(v)) { set({ terms: [...d.terms, v] }); setCustom('') } }}>
          <input className="input" value={custom} maxLength={600} onChange={(e) => setCustom(e.target.value)} onPaste={(e) => { const t = e.clipboardData.getData('text'); if (!/[\r\n]/.test(t) && t.length + custom.length <= 600) return; e.preventDefault(); const add = splitPaste(t).filter((x) => !has(x)); if (add.length) set({ terms: [...d.terms, ...add] }) }} placeholder="Add one clause. You can use {client}, {total}, {due_date}." aria-label="Add a clause" />
          <Button type="submit" disabled={!custom.trim()}><Plus size={16} aria-hidden />Add</Button>
        </form>
      </div>
      <div className="st-block">
        <div className="st-row"><h3>Your own terms</h3><span className="st-acts"><Button onClick={() => setEdit('terms')}><PenLine size={16} aria-hidden />{d.extra.customTerms.trim() ? 'Edit' : 'Write your own'}</Button>{d.terms.length > 0 && <Button onClick={editAll}><PenLine size={16} aria-hidden />Edit with the suggested terms</Button>}</span></div>
        <BlockPreview value={d.extra.customTerms} empty="Nothing written yet. Open the editor to add headings and points in your own words." />
      </div>
      <div className="st-block">
        <div className="st-row"><h3>Annexure page</h3><Button onClick={writeAnnexure}><FileText size={16} aria-hidden />Write from scope</Button></div>
        <p className="hint">An optional last page that spells out the scope. Leave empty to leave it out. Templates fill in names, amounts and dates.</p>
        <div className="chips2">{ANNEX_TEMPLATES.map((a) => <Chip key={a.id} on={d.extra.annexure.includes(a.text.split('\n')[0])} onClick={() => { markGenerated(); ex({ annexure: d.extra.annexure.includes(a.text.split('\n')[0]) ? d.extra.annexure : [d.extra.annexure.trim(), a.text].filter(Boolean).join('\n') }) }}>{a.label}</Chip>)}</div>
        <div className="st-row"><span className="hint">{d.extra.annexure.trim() ? 'On the last page of the invoice.' : 'Empty, so no annexure page.'}</span><Button onClick={() => setEdit('annex')}><PenLine size={16} aria-hidden />{d.extra.annexure.trim() ? 'Edit annexure' : 'Write annexure'}</Button></div>
        <BlockPreview value={d.extra.annexure} empty="" />
        <BlockEditorDialog open={edit === 'annex'} onClose={() => setEdit(null)} title="Annexure" value={d.extra.annexure} max={6000} onChange={(v) => ex({ annexure: v })} />
        <BlockEditorDialog open={edit === 'terms'} onClose={() => setEdit(null)} title="Terms" value={d.extra.customTerms} onChange={(v) => ex({ customTerms: v })} />
      </div>
    </div>
  )
}
