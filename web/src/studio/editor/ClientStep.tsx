import { Mail, MapPin, MessageCircle, Pencil, UserPlus } from 'lucide-react'
import { DatePicker } from '../../components/DatePicker'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { fromDateInput, toDateInput } from '../../lib/dates'
import { gstinValid, stateName, stateOf } from '../../lib/gst'
import { salutationFor } from '../../lib/scope'
import type { Group, InvoiceType, Link as ClientLink } from '../../lib/types'
import { FieldInput } from '../EditorParts'
import { daysBetween, isoIn, type Draft } from './state'

export const INTRO = 'Following is the summary of the invoice for the work delivered.'

export function ClientStep({ d, set, type, links, groups, onEditClient, onAdd, showErrors }: { d: Draft; set: (p: Partial<Draft>, m?: string) => void; type: InvoiceType; links: ClientLink[]; groups: Group[]; onEditClient: (l: ClientLink) => void; onAdd: () => void; showErrors: boolean }) {
  const link = links.find((l) => l.id === d.linkId)
  const st = stateName(stateOf(link?.gstin, link?.state))
  function pick(id: string) {
    const l = links.find((x) => x.id === id)
    const g = groups.find((x) => x.id === l?.groupId)
    const greet = d.extra.salutation ? { salutation: salutationFor(l?.honorific, l?.attention || l?.name || '') } : {}
    set({ linkId: id, ...(g ? { theme: g.theme, due: isoIn(g.dueDays, new Date(d.issued)) } : {}), extra: { ...d.extra, ...greet } })
  }
  const greeting = !!(d.extra.salutation || d.extra.intro)
  return (
    <div className="st">
      <div className="st-block">
        <h3>Who is it for?</h3>
        <div className={`who-grid ${showErrors && !link ? 'err shake' : ''}`} role="radiogroup" aria-label="Client">
          {links.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={l.id === d.linkId} className="who tap" onClick={() => pick(l.id)}>
              {l.logo ? <img src={l.logo} alt="" className="who-logo" /> : <span className="avatar" aria-hidden>{(l.company || l.name).slice(0, 1)}</span>}
              <span className="trunc"><b className="trunc">{l.company || l.name}</b><small className="trunc">{l.status === 'invited' ? 'Invite sent' : l.company ? `${l.honorific ? l.honorific + ' ' : ''}${l.attention || l.name}` : l.email}</small></span>
            </button>
          ))}
          <button type="button" className="who who-add tap" onClick={onAdd}><UserPlus size={18} aria-hidden /><span>Add a client</span></button>
        </div>
        {link && (<>
          <ul className="facts" aria-label="How it reaches them">
            <li className={link.email ? 'ok' : ''}><Mail size={14} aria-hidden />{link.email ? `Emailed to ${link.email}` : 'No email: add one so they get a copy'}</li>
            <li className={link.phone ? 'ok' : ''}><MessageCircle size={14} aria-hidden />{link.phone ? `WhatsApp ready for ${link.phone}` : 'No WhatsApp number'}</li>
            <li className={st ? 'ok' : ''}><MapPin size={14} aria-hidden />{st ? `${st}${link.gstin ? (gstinValid(link.gstin) ? ', GSTIN checks out' : ', GSTIN looks wrong') : ''}` : 'State unknown: tax is treated as same-state'}</li>
          </ul>
          <Button variant="ghost" onClick={() => onEditClient(link)}><Pencil size={16} aria-hidden />Edit {link.company || link.name}'s details and logo</Button>
        </>)}
      </div>
      <div className="st-block">
        <div className="st-row"><h3>Greeting</h3>
          <label className="switch-row compact"><span>Show on invoice</span><input type="checkbox" role="switch" checked={greeting} onChange={(e) => set({ extra: { ...d.extra, salutation: e.target.checked ? salutationFor(link?.honorific, link?.attention || link?.name || '') : '', intro: e.target.checked ? INTRO : '' } })} /></label>
        </div>
        {greeting && (<>
          <Field label="Salutation" value={d.extra.salutation} maxLength={120} onChange={(e) => set({ extra: { ...d.extra, salutation: e.target.value } }, 'sal')} hint="Adapts to the client's title: Dear Mr. Mehta, or Respected Sir / Madam," />
          <Field label="Opening line" value={d.extra.intro} maxLength={300} onChange={(e) => set({ extra: { ...d.extra, intro: e.target.value } }, 'intro')} />
        </>)}
      </div>
      <div className="st-block">
        <h3>Dates</h3>
        <div className="grid2">
          <DatePicker label="Invoice date" value={toDateInput(d.issued)} onChange={(v) => { if (!v) return; const iss = new Date(fromDateInput(v)); set({ issued: iss.toISOString(), due: isoIn(daysBetween(d.issued, d.due), iss) }) }} today />
          <DatePicker label="Due date" value={toDateInput(d.due)} min={toDateInput(d.issued)} onChange={(v) => v && set({ due: fromDateInput(v) })} />
        </div>
        {type.fields.filter((f) => f.place === 'top').map((f) => <FieldInput key={f.id} f={f} value={d.fields[f.id] ?? ''} error={showErrors && f.required && !d.fields[f.id]?.trim()} onChange={(v) => set({ fields: { ...d.fields, [f.id]: v } }, `f-${f.id}`)} />)}
      </div>
    </div>
  )
}
