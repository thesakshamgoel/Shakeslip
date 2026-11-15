import type { Honorific, PlanKind } from './types'

/* Wording helpers from the original Shakeslip: services become the first line and the banner. */
export const ITEM_PREFIXES = ['Professional charges for', 'Professional fees for', 'Charges towards'] as const
export const BANNER_PREFIXES = ['Invoice towards Professional Charges for', 'Professional Charges for'] as const
export const CATEGORIES = ['', 'Video', 'Photoshoot', 'Marketing campaign', 'Design deliverables', 'Project deliverables', 'Website', 'Event'] as const

export const listJoin = (a: string[]) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`)

export const salutationFor = (h: Honorific | undefined, name: string) => {
  const last = name.trim().split(/\s+/).slice(-1)[0] ?? ''
  if (h === 'M/s.' || !h || !last) return 'Respected Sir / Madam,'
  return `Dear ${h} ${last},`
}
export const attentionLine = (h: Honorific | undefined, name: string) => (h && h !== 'M/s.' ? `${h} ${name}` : name)

export const PLANS: { kind: PlanKind; label: string }[] = [
  { kind: 'none', label: 'No schedule' }, { kind: 'advance_balance', label: 'Advance and balance' }, { kind: 'full_advance', label: 'Full advance' },
  { kind: 'on_completion', label: 'On completion' }, { kind: 'due_on_receipt', label: 'Due on receipt' }, { kind: 'net15', label: 'Net 15' }, { kind: 'net30', label: 'Net 30' }, { kind: 'custom', label: 'Custom' },
]

/* The payment schedule printed on the invoice. Amounts are computed, never typed. */
export function planRows(kind: PlanKind, pct: number, total: number, text: string): { label: string; amount: number | null; when: string }[] {
  switch (kind) {
    case 'advance_balance': { const adv = Math.round((total * pct) / 100); return [{ label: `Advance (${pct}%)`, amount: adv, when: 'To confirm the booking' }, { label: `Balance (${100 - pct}%)`, amount: total - adv, when: 'On delivery' }] }
    case 'full_advance': return [{ label: 'Full payment (100%)', amount: total, when: 'Before work begins' }]
    case 'on_completion': return [{ label: 'Full payment (100%)', amount: total, when: 'On completion' }]
    case 'due_on_receipt': return [{ label: 'Full payment', amount: total, when: 'On receipt of this invoice' }]
    case 'net15': return [{ label: 'Full payment', amount: total, when: 'Within 15 days' }]
    case 'net30': return [{ label: 'Full payment', amount: total, when: 'Within 30 days' }]
    case 'custom': return text ? [{ label: text, amount: null, when: '' }] : []
    default: return []
  }
}
export const planSummary = (kind: PlanKind, pct: number, text: string) =>
  ({ none: '', advance_balance: `${pct}% advance, ${100 - pct}% on delivery`, full_advance: 'Full advance payment', on_completion: 'Full payment on completion', due_on_receipt: 'Due on receipt', net15: 'Net 15 days', net30: 'Net 30 days', custom: text })[kind]

/* "Editing" + "music video" + "Raat ko Jaagoon" -> Editing of the music video "Raat ko Jaagoon" */
export function jobSentence(j: { what: string; kind: string; name: string }): string {
  const what = j.what.trim(), kind = j.kind.trim(), name = j.name.trim()
  if (!what && !name) return ''
  const w = what ? what.charAt(0).toUpperCase() + what.slice(1) : 'Work'
  return `${w}${kind ? ` of the ${kind}` : ''}${name ? ` "${name}"` : ''}`
}
