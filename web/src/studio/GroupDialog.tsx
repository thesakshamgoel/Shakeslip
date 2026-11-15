import { useState } from 'react'
import { Select } from '../components/Select'
import { Button } from '../components/Button'
import { Dialog } from '../components/Dialog'
import { Field } from '../components/Field'
import { ReminderRules, type Rules } from '../components/ReminderRules'
import { del, errText, post, put } from '../lib/api'
import { useToast } from '../lib/toast'
import type { Group, InvoiceType } from '../lib/types'
import { invoiceThemes } from '../themes/invoice'
import './clients.css'

/* A group is how you tailor the software per kind of client: default type, look, terms and reminders. */
export function GroupDialog({ open, onClose, group, types, onDone }: { open: boolean; onClose: () => void; group: Group | null; types: InvoiceType[]; onDone: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [rules, setRules] = useState<Rules>(group?.reminders ?? { before: [2], onDue: true, afterEvery: 7 })

  async function submit(f: FormData) {
    if (busy) return
    setBusy(true)
    const body = { name: f.get('name'), typeId: f.get('type') || null, theme: f.get('theme'), dueDays: Number(f.get('due')) || 0, reminders: rules }
    try { if (group) await put(`/studio/groups/${group.id}`, body); else await post('/studio/groups', body); toast.ok(group ? 'Group updated.' : 'Group created.'); onDone(); onClose() } catch (e) { toast.bad(errText(e)) } finally { setBusy(false) }
  }
  async function remove() {
    if (!group || !window.confirm(`Delete the group "${group.name}"? Its clients stay, they just won't be in a group.`)) return
    try { await del(`/studio/groups/${group.id}`); toast.ok('Group deleted.'); onDone(); onClose() } catch (e) { toast.bad(errText(e)) }
  }

  return (
    <Dialog open={open} onClose={onClose} title={group ? 'Edit group' : 'New group'}>
      <form className="dlg-form" onSubmit={(e) => { e.preventDefault(); void submit(new FormData(e.currentTarget)) }}>
        <Field label="Group name" name="name" defaultValue={group?.name} placeholder="For example, Wedding clients" required maxLength={60} />
        <Select label="Usual invoice type" name="type" value={group?.typeId ?? ''} options={[{ value: '', label: 'Ask me each time' }, ...types.map((t) => ({ value: t.id ?? '', label: t.name }))]} />
        <div className="grid2">
          <Select label="Look" name="theme" value={group?.theme ?? ''} options={[{ value: '', label: 'My default design', hint: 'Follows Settings, Defaults' }, ...invoiceThemes.map((t) => ({ value: t.id, label: t.name, hint: t.blurb }))]} />
          <Field label="Due in (days)" name="due" inputMode="numeric" defaultValue={group?.dueDays ?? 7} />
        </div>
        <fieldset className="remind"><legend>Automatic reminders</legend><ReminderRules value={rules} onChange={setRules} /></fieldset>
        <Button variant="primary" type="submit" block disabled={busy}>{busy ? 'Saving' : group ? 'Save group' : 'Create group'}</Button>
        {group && <Button variant="ghost" block onClick={remove}>Delete group</Button>}
      </form>
    </Dialog>
  )
}
