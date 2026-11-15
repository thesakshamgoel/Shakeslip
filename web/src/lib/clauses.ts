/* Terms library. Clauses are templates; {tokens} are filled from the invoice when it is shown,
   so amounts and names are always right. Wording is a starting point, not legal advice. */
export type Clause = { id: string; text: string }
export type ClauseGroup = { id: string; label: string; clauses: Clause[] }

export const CLAUSES: ClauseGroup[] = [
  { id: 'pay', label: 'Payment and financial terms', clauses: [
    { id: 'pay_due', text: 'Payment of {balance} is due by {due_date}.' },
    { id: 'pay_plan_ab', text: '{advance_pct}% of the total ({plan_advance}) is payable in advance to confirm the booking. The remaining {balance_pct}% ({plan_balance}) is payable on delivery.' },
    { id: 'pay_on_completion', text: 'The full amount of {total} is payable on completion of the work.' },
    { id: 'pay_net', text: 'Payment of {balance} is due within {due_days} days of this invoice, by {due_date}.' },
    { id: 'pay_advance', text: 'An advance of {advance} has been received. The balance of {balance} is payable by {due_date}.' },
    { id: 'pay_5050', text: '50% of the total ({half}) is payable in advance to confirm the booking. The remaining 50% ({half}) is payable on delivery.' },
    { id: 'pay_upfront', text: 'The full amount of {total} is payable before work begins.' },
    { id: 'pay_late', text: 'Payments received after the due date attract interest of 1.5% per month on the unpaid amount.' },
    { id: 'pay_tds', text: 'If TDS is deducted, {client} will share the Form 16A certificate within the statutory time limit.' },
    { id: 'pay_fees', text: 'Bank or transfer charges, if any, are borne by {client}.' },
  ] },
  { id: 'scope', label: 'Scope and revisions', clauses: [
    { id: 'scope_defined', text: 'This invoice covers only the work listed above. Anything else is out of scope and will be quoted separately.' },
    { id: 'scope_revisions', text: 'The fee includes up to two rounds of revisions. Further revisions are billed at the agreed hourly rate.' },
    { id: 'scope_changes', text: 'Changes requested after sign-off are treated as new work and quoted separately.' },
    { id: 'scope_delays', text: 'Delays in feedback or materials from {client} may move the delivery date.' },
  ] },
  { id: 'ip', label: 'Intellectual property and rights', clauses: [
    { id: 'ip_transfer', text: 'Usage rights in the final deliverables transfer to {client} only after full payment of {total} is received.' },
    { id: 'ip_source', text: 'Working files, raw footage and source files remain with {business} unless bought separately.' },
    { id: 'ip_portfolio', text: '{business} may show the work in its portfolio and showreel, unless agreed otherwise in writing.' },
    { id: 'ip_credit', text: '{client} agrees to credit {business} where credits are customary.' },
  ] },
  { id: 'legal', label: 'Cancellation and jurisdiction', clauses: [
    { id: 'legal_cancel', text: 'If the project is cancelled by {client}, the advance is non-refundable and work done to date is payable.' },
    { id: 'legal_reschedule', text: 'Rescheduling with less than 7 days notice may attract a rescheduling fee.' },
    { id: 'legal_liability', text: 'The liability of {business} is limited to the amount paid under this invoice.' },
    { id: 'legal_jurisdiction', text: 'Any dispute is subject to the jurisdiction of the courts in {city}.' },
  ] },
  { id: 'usage', label: 'Usage and confidentiality', clauses: [
    { id: 'u_licence', text: '{client} may use the deliverables for the purpose agreed for this project, in India, without time limit, once paid in full.' },
    { id: 'u_social', text: 'Use on social media and the web is included. Television, cinema, outdoor and paid advertising need a separate licence.' },
    { id: 'u_conf', text: 'Both parties will keep confidential any non-public information shared during the project.' },
    { id: 'u_nda', text: '{business} will not share unreleased work or footage without written permission from {client}.' },
  ] },
  { id: 'costs', label: 'Expenses and delays', clauses: [
    { id: 'c_travel', text: 'Travel, stay and equipment rental outside {city} are billed at actual cost, with receipts.' },
    { id: 'c_permits', text: 'Location permits, venue fees and third-party licences are arranged and paid by {client} unless listed above.' },
    { id: 'c_force', text: 'Neither party is responsible for delays caused by events outside reasonable control, such as natural disasters, strikes or government orders.' },
    { id: 'c_hold', text: 'If {client} pauses the project for more than 30 days, work done so far becomes payable.' },
  ] },
  { id: 'deliv', label: 'Deliverables', clauses: [
    { id: 'd_video', text: 'Final films are delivered in 4K and 1080p web formats, with a broadcast-safe master on request.' },
    { id: 'd_shoot', text: 'A shoot day covers up to ten hours on set including breaks. Extra hours are billed pro rata.' },
    { id: 'd_photo', text: 'Edited photographs are delivered through an online gallery within the agreed time. Raw files are not included.' },
    { id: 'd_design', text: 'Final artwork is delivered as print-ready PDF and web-ready PNG files. Editable source files are billed separately.' },
    { id: 'd_web', text: 'The website is handed over after final payment. Hosting, domain and third-party licences are paid by {client}.' },
    { id: 'd_support', text: 'Bugs reported within 30 days of launch are fixed free of charge. New features are quoted separately.' },
    { id: 'd_event', text: 'Final guest count and timings are confirmed 7 days before the event. Changes after that may change the price.' },
  ] },
]

const GROUP_OF = new Map(CLAUSES.flatMap((g) => g.clauses.map((c) => [c.text, g.label] as const)))
/* Groups the chosen clauses under headings, like the original Terms pages. Custom clauses go last. */
export function groupTerms(terms: string[]): { label: string; items: string[] }[] {
  const order = [...CLAUSES.map((g) => g.label), 'Other terms']
  const map = new Map<string, string[]>()
  for (const t of terms) { const g = GROUP_OF.get(t) ?? 'Other terms'; map.set(g, [...(map.get(g) ?? []), t]) }
  return order.filter((l) => map.has(l)).map((l) => ({ label: l, items: map.get(l)! }))
}

/* Matches deliverable clauses to the services and category on the invoice. */
export function autoMatch(services: string, category: string): string[] {
  const s = `${services} ${category}`.toLowerCase()
  const ids: string[] = []
  if (/cinemat|video|film|edit|grading|drone|motion/.test(s)) ids.push('d_video', 'd_shoot')
  if (/photo/.test(s)) ids.push('d_photo')
  if (/logo|brand|design|brochure|packag|illustr|creative|print/.test(s)) ids.push('d_design')
  if (/web|app|ui|ux|seo|hosting|software/.test(s)) ids.push('d_web', 'd_support')
  if (/event|wedding|decor|catering|music|venue/.test(s)) ids.push('d_event')
  return ids.map((id) => clauseById(id)!.text)
}

export const clauseById = (id: string) => CLAUSES.flatMap((g) => g.clauses).find((c) => c.id === id)

export type ClauseContext = { client: string; business: string; city: string; total: string; advance: string; balance: string; half: string; dueDate: string; dueDays: number; project: string; advancePct?: number; planAdvance?: string; planBalance?: string }

export function fillClause(text: string, c: ClauseContext): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v: Record<string, string> = { client: c.client || 'the client', business: c.business || 'the business', city: c.city || 'India', total: c.total, advance: c.advance, balance: c.balance, half: c.half, due_date: c.dueDate, due_days: String(c.dueDays), project: c.project || 'this project', advance_pct: String(c.advancePct ?? 50), balance_pct: String(100 - (c.advancePct ?? 50)), plan_advance: c.planAdvance ?? c.half, plan_balance: c.planBalance ?? c.half }
    return v[k] ?? m
  })
}

/* Picks sensible clauses from what is on the invoice. The person can always change them. */
export function suggestClauses(opts: { advance: number; dueDays: number; profession: string; plan?: string }): string[] {
  const ids = ['scope_defined']
  /* the payment clause follows the payment plan, so the wording and numbers always match */
  const payId = ({ advance_balance: 'pay_plan_ab', full_advance: 'pay_upfront', on_completion: 'pay_on_completion', net15: 'pay_net', net30: 'pay_net' } as Record<string, string>)[opts.plan ?? ''] ?? (opts.advance > 0 ? 'pay_advance' : 'pay_due')
  ids.unshift(payId)
  if (opts.dueDays > 0) ids.push('pay_late')
  if (['video', 'design', 'software', 'events'].includes(opts.profession)) ids.push('scope_revisions', 'ip_transfer', 'ip_portfolio')
  if (opts.profession === 'events') ids.push('legal_cancel', 'legal_reschedule', 'c_permits')
  if (['video', 'design', 'software'].includes(opts.profession)) ids.push('u_licence', 'u_conf')
  if (opts.profession === 'video') ids.push('c_travel')
  ids.push('legal_jurisdiction')
  return ids.map((id) => clauseById(id)!.text)
}

/* Short names for the clause chips, so nothing is cut mid-sentence. The full wording shows once a clause is added. */
const TITLES: Record<string, string> = {
  pay_due: 'Balance due by date', pay_plan_ab: 'Advance and balance', pay_on_completion: 'Pay on completion', pay_net: 'Pay within set days', pay_advance: 'Advance received', pay_5050: '50% advance, 50% on delivery',
  pay_upfront: 'Full payment upfront', pay_late: 'Late payment interest', pay_tds: 'TDS certificate', pay_fees: 'Bank charges',
  scope_defined: 'Scope limited to this invoice', scope_revisions: 'Two rounds of revisions', scope_changes: 'Changes after sign-off', scope_delays: 'Client delays',
  ip_transfer: 'Rights after full payment', ip_source: 'Source files stay with you', ip_portfolio: 'Portfolio use', ip_credit: 'Credit line',
  legal_cancel: 'Cancellation', legal_reschedule: 'Rescheduling', legal_liability: 'Liability limit', legal_jurisdiction: 'Jurisdiction',
  u_licence: 'Usage licence', u_social: 'Social media use', u_conf: 'Confidentiality', u_nda: 'Unreleased work',
  c_travel: 'Travel costs', c_permits: 'Permits and venue fees', c_force: 'Events beyond control', c_hold: 'Project on hold',
  d_video: 'Film formats', d_shoot: 'Shoot day length', d_photo: 'Photo delivery', d_design: 'Design files', d_web: 'Website handover', d_support: 'Bug-fix window', d_event: 'Event confirmations',
}
export const clauseTitle = (c: Clause) => TITLES[c.id] ?? c.id.replace(/_/g, ' ')
