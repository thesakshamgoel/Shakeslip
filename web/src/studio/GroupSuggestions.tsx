import { AnimatePresence, motion } from 'motion/react'
import { Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button, IconButton } from '../components/Button'
import { errText, patch, post } from '../lib/api'
import { stateName, stateOf } from '../lib/gst'
import { springSoft } from '../lib/motion'
import { useToast } from '../lib/toast'
import type { Group, InvoiceRow, Link as ClientLink } from '../lib/types'
import { useApi } from '../lib/useApi'

type Suggestion = { key: string; name: string; text: string; ids: string[]; dueDays: number }
const KEY = 'ss-group-hints-dismissed'
const readDismissed = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[] } catch { return [] } }

/* Looks at your clients and invoices and offers one-tap groups: monthly retainers and clients in other states. */
export function GroupSuggestions({ links, groups, bizState, onDone }: { links: ClientLink[]; groups: Group[]; bizState: string; onDone: () => void }) {
  const rows = useApi<InvoiceRow[]>('/studio/invoices').data ?? []
  const toast = useToast()
  const [dismissed, setDismissed] = useState(readDismissed)
  const [busy, setBusy] = useState('')

  const list = useMemo(() => {
    const out: Suggestion[] = []
    const active = links.filter((l) => l.status !== 'pending')
    /* worth suggesting only if they are not already together in one group */
    /* already grouped only if one group holds exactly these clients and nobody else */
    const apart = (ids: string[]) => {
      const gs = new Set(ids.map((id) => active.find((l) => l.id === id)?.groupId ?? ''))
      const [g] = [...gs]
      return gs.size > 1 || !g || active.some((l) => l.groupId === g && !ids.includes(l.id))
    }
    const since = Date.now() - 183 * 86_400_000
    const months = new Map<string, Set<string>>()
    for (const r of rows) if (r.linkId && r.status !== 'draft' && r.status !== 'void' && new Date(r.issued).getTime() >= since) months.set(r.linkId, (months.get(r.linkId) ?? new Set()).add(r.issued.slice(0, 7)))
    const retainers = [...months].filter(([, m]) => m.size >= 3).map(([id]) => id).filter((id) => active.some((l) => l.id === id))
    if (retainers.length >= 2 && apart(retainers)) out.push({ key: `ret-${retainers.sort().join()}`, name: 'Monthly retainers', text: `${retainers.length} clients were invoiced in 3 or more of the last 6 months.`, ids: retainers, dueDays: 7 })
    const other = active.filter((l) => { const st = stateOf(l.gstin, l.state); return !!st && !!bizState && st !== bizState }).map((l) => l.id)
    if (other.length >= 2 && apart(other)) out.push({ key: `ist-${other.sort().join()}`, name: 'Other states', text: `${other.length} clients are outside ${stateName(bizState) || 'your state'}, so their invoices carry IGST.`, ids: other, dueDays: 15 })
    return out.filter((s) => !dismissed.includes(s.key) && !groups.some((g) => g.name === s.name))
  }, [rows, links, groups, bizState, dismissed])

  const dismiss = (k: string) => { const next = [...dismissed, k]; setDismissed(next); try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode: hint just returns next visit */ } }
  async function make(s: Suggestion) {
    if (busy) return
    setBusy(s.key)
    try {
      const g = await post<{ id: string }>('/studio/groups', { name: s.name, typeId: null, theme: 'classic', dueDays: s.dueDays, reminders: { before: [2], onDue: true, afterEvery: 7 } })
      for (const id of s.ids) await patch(`/studio/links/${id}`, { groupId: g.id })
      toast.ok(`${s.name} created with ${s.ids.length} clients. Edit its look and reminders any time.`); onDone()
    } catch (e) { toast.bad(errText(e)) } finally { setBusy('') }
  }

  return (
    <AnimatePresence initial={false}>
      {list.map((s) => {
        const names = links.filter((l) => s.ids.includes(l.id)).map((l) => l.company || l.name)
        return (
          <motion.section key={s.key} className="hint-card" layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={springSoft} aria-label="Suggested group">
            <Sparkles size={18} aria-hidden className="hint-ic" />
            <div className="hint-body"><b>Group them as "{s.name}"?</b><span>{s.text} {names.join(', ')}.</span></div>
            <div className="hint-act">
              <Button variant="primary" disabled={!!busy} onClick={() => make(s)}>{busy === s.key ? 'Making group' : 'Make group'}</Button>
              <IconButton label="Not now" onClick={() => dismiss(s.key)}><X size={18} /></IconButton>
            </div>
          </motion.section>
        )
      })}
    </AnimatePresence>
  )
}
