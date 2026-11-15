import { db } from './db.ts'
import { LOGO_KORA, LOGO_MW, LOGO_NF } from './demoLogos.ts'
import { env } from './env.ts'

/* Local testing only. A demo business with a full profile, three clients, and invoices in every state,
   built by replaying the real API calls. Fictional people and companies. Never mounted in production. */
export const DEMO_PASSWORD = 'demo-pass-2026'
export const DEMO = { studio: 'studio@demo.test', client: 'client@demo.test' }

type Fetch = (r: Request) => Response | Promise<Response>
const DAY = 86_400_000
const at = (days: number) => new Date(Date.now() + days * DAY).toISOString()

export async function seedDemo(fetch: Fetch): Promise<boolean> {
  if (db.query('SELECT 1 FROM users WHERE email = ?').get(DEMO.studio)) return false
  const jar: Record<string, string> = {}
  const call = async (who: string, method: string, path: string, body?: unknown) => {
    const res = await fetch(new Request(`http://local${path}`, { method, headers: { 'content-type': 'application/json', origin: env.APP_URL, cookie: jar[who] ?? '' }, body: body === undefined ? undefined : JSON.stringify(body) }))
    const sc = res.headers.get('set-cookie')
    if (sc) jar[who] = sc.split(';')[0]
    const data = (await res.json()) as any
    if (!res.ok) throw new Error(`demo seed failed at ${path}: ${data?.message}`)
    return data
  }
  const S = 'studio'
  await call(S, 'POST', '/api/account/signup', { name: 'Riya Kapoor', email: DEMO.studio, password: DEMO_PASSWORD, role: 'studio', acceptTerms: true })
  await call(S, 'POST', '/api/studio', { name: 'Northlight Films', gstin: '27AAPFU0939F1ZV', address: '402 Creative Lofts, Bandra West', city: 'Mumbai', email: '', phone: '+91 98200 11223', profession: 'video' })
  await call(S, 'PUT', '/api/studio', { name: 'Northlight Films', gstin: '27AAPFU0939F1ZV', address: '402 Creative Lofts, Bandra West', city: 'Mumbai', email: 'hello@northlight.example', phone: '+91 98200 11223', website: 'northlight.example', pan: 'AAPFU0939F', upiId: 'northlight@okhdfc', bankName: 'HDFC Bank', accountName: 'Northlight Films', accountNo: '50200044881122', ifsc: 'HDFC0000145', profession: 'video' })
  await call(S, 'PUT', '/api/studio/signature', { kind: 'typed', text: 'Riya Kapoor', font: 'great-vibes' })
  await call(S, 'PUT', '/api/studio/logo', { image: LOGO_NF, size: 'm' })
  const groups = await call(S, 'GET', '/api/studio/groups')
  const g = groups[0].id

  const invite = await call(S, 'POST', '/api/studio/links/invite', { name: 'Aarav Mehta', email: DEMO.client, phone: '98765 43210', company: 'Mehta Weddings', groupId: g })
  await call('client', 'POST', '/api/account/signup', { name: 'Aarav Mehta', email: DEMO.client, password: DEMO_PASSWORD, role: 'slip', acceptTerms: true })
  await call('client', 'PUT', '/api/account/me', { name: 'Aarav Mehta', phone: '+91 98765 43210', company: 'Mehta Weddings', gstin: '', address: '14 Harbour Road', area: 'Bandra West', city: 'Mumbai', pin: '400050', state: '27', honorific: 'Mr.', pan: '' })
  await call('client', 'PUT', '/api/account/logo', { image: LOGO_MW })
  await call('client', 'POST', `/api/join/${invite.inviteUrl.split('/join/')[1]}`, {})
  const kora0 = await call(S, 'POST', '/api/studio/links/invite', { name: 'Kabir Rao', email: 'kabir@kora.example', phone: '98450 12345', company: 'Kora Design Pvt Ltd', groupId: g, gstin: '29AAGCB7383J1Z4', honorific: 'Mr.', address: '3rd Floor, Indiranagar 100 Ft Road', city: 'Bengaluru', pin: '560038' })
  await call(S, 'PATCH', `/api/studio/links/${kora0.id}`, { logo: LOGO_KORA })
  await call(S, 'POST', '/api/studio/links/invite', { name: 'Naina Sethi', email: 'naina@lumen.example', phone: '', company: 'Lumen Cafe', groupId: g })

  const links = await call(S, 'GET', '/api/studio/links')
  const L = (email: string) => links.find((l: { email: string }) => l.email === email).id
  const types = await call(S, 'GET', '/api/studio/types')
  const T = (prefix: string) => types.find((t: { prefix: string }) => t.prefix === prefix).id
  const terms = ['An advance of {advance} has been received. The balance of {balance} is payable by {due_date}.', 'This invoice covers only the work listed above. Anything else is out of scope and will be quoted separately.', 'Usage rights in the final deliverables transfer to {client} only after full payment of {total} is received.', 'Any dispute is subject to the jurisdiction of the courts in {city}.']
  const make = async (o: { link: string; type: string; items: [string, number, number, string?][]; issued: number; due: number; project: string; advance?: number; fields?: Record<string, string>; send?: boolean; extra?: Record<string, unknown> }) => {
    const inv = await call(S, 'POST', '/api/studio/invoices', {
      linkId: o.link, typeId: o.type, theme: 'classic', items: o.items.map(([desc, qty, rupees, unit], i) => ({ id: `l${i}`, desc, qty, rate: rupees * 100, unit: unit ?? '' })), fields: o.fields ?? {},
      gstPct: 18, discount: 0, advance: (o.advance ?? 0) * 100, issued: at(o.issued), due: at(o.due), note: 'Thank you for choosing us.', project: o.project, terms, taxInclusive: false, extra: o.extra ?? {},
    })
    if (o.send !== false) await call(S, 'POST', `/api/studio/invoices/${inv.id}/send`, {})
    return inv.id
  }
  const aarav = L(DEMO.client), kora = L('kabir@kora.example'), lumen = L('naina@lumen.example')
  const paid = await make({ link: kora, type: T('INV'), items: [['Brand film, 60 seconds', 1, 85000], ['Motion graphics pack', 3, 6000]], issued: -40, due: -25, project: 'Kora brand film' })
  await call(S, 'POST', `/api/studio/invoices/${paid}/payments`, { amount: 12154000, method: 'bank', ref: 'NEFT 4821' })
  await make({ link: lumen, type: T('INV'), items: [['Menu photography, half day', 1, 18000], ['Reels, 4 short videos', 4, 6000]], issued: -20, due: -6, project: 'Lumen winter menu' })
  await make({ link: aarav, type: T('EVT'), items: [['Professional charges for Cinematography, Editing and Colour grading', 2, 65000, 'Days'], ['Highlight film, 4K', 1, 45000, 'Package'], ['Edited photographs', 300, 50, 'Photos']], issued: -2, due: 12, advance: 50000, project: 'Wedding film, December 2026',
    fields: { event_date: '2026-12-05', venue: 'Taj Palace, Mumbai', deliverables: 'Highlight film (4 min), full film, 300 edited photos' },
    extra: { category: 'Video', completionDate: '2026-12-05', banner: 'Invoice towards Professional Charges for Cinematography, Editing and Colour grading.', salutation: 'Dear Mr. Mehta,', intro: 'Following is the summary of the invoice for the work delivered.',
      plan: { kind: 'advance_balance', advancePct: 50 }, annexure: '# Scope of work\n- Two days of cinematography with two shooters\n- Highlight film (4 minutes) and full-length film\n- 300 edited photographs\n# Timeline\n- Shoot: 5 December 2026\n- Delivery: within 30 days of the shoot' } })
  await make({ link: aarav, type: T('QTN'), items: [['Pre-wedding shoot, 1 day', 1, 55000]], issued: 0, due: 30, project: 'Pre-wedding shoot', send: false })
  await call('client', 'GET', '/api/slip/invoices') // nothing opened yet; the inbox shows them fresh
  return true
}
