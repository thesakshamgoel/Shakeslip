import { expect, test } from 'bun:test'

process.env.DB_PATH = ':memory:'
const { default: server } = await import('../src/index.ts')
const { db } = await import('../src/db.ts')

const ORIGIN = 'http://localhost:5173'
function agent() {
  let cookie = ''
  return async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await server.fetch(new Request(`http://x${path}`, {
      method, headers: { 'content-type': 'application/json', origin: ORIGIN, cookie, ...headers }, body: body === undefined ? undefined : JSON.stringify(body),
    }))
    const sc = res.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0]
    return { status: res.status, body: (await res.json().catch(() => ({}))) as any }
  }
}
const pw = 'correct-horse-battery'
const owner = agent(), client = agent(), stranger = agent()

test('security basics', async () => {
  const a = agent()
  expect((await a('GET', '/api/studio/invoices')).status).toBe(401)
  expect((await a('POST', '/api/account/signup', { name: 'X', email: 'x@x.com', password: 'short', role: 'slip', acceptTerms: true })).status).toBe(422)
  expect((await a('POST', '/api/account/login', { email: 'x@x.com', password: pw }, { origin: 'http://evil.example' })).status).toBe(403)
})

test('full journey', async () => {
  expect((await owner('POST', '/api/account/signup', { name: 'Riya Kapoor', email: 'riya@studio.test', password: pw, role: 'studio', acceptTerms: true })).body.next).toBe('/studio/setup')
  expect((await owner('POST', '/api/studio', { name: 'Northlight Films', gstin: '', address: '', city: 'Delhi', email: '', phone: '' })).status).toBe(200)
  const types = (await owner('GET', '/api/studio/types')).body
  expect(types.length).toBe(4)
  const groups = (await owner('GET', '/api/studio/groups')).body
  expect(groups.length).toBe(1)

  // custom invoice type
  const t = { ...types[0], name: 'Shoot day', title: 'Shoot invoice', prefix: 'SHT', fields: [{ id: 'venue', label: 'Venue', kind: 'text', required: true, place: 'top' }] }
  delete t.id
  const created = await owner('POST', '/api/studio/types', t)
  expect(created.status).toBe(200)

  // invite by email
  const inv = await owner('POST', '/api/studio/links/invite', { name: 'Aarav Mehta', email: 'aarav@client.test', phone: '+91 98765 43210', company: 'Mehta Weddings', groupId: groups[0].id })
  expect(inv.body.inviteUrl).toContain('/join/')
  const tokenStr = inv.body.inviteUrl.split('/join/')[1]

  // client signs up, wrong email cannot join
  await client('POST', '/api/account/signup', { name: 'Aarav Mehta', email: 'aarav@client.test', password: pw, role: 'slip', acceptTerms: true })
  await stranger('POST', '/api/account/signup', { name: 'Eve', email: 'eve@evil.test', password: pw, role: 'slip', acceptTerms: true })
  expect((await stranger('POST', `/api/join/${tokenStr}`, {})).status).toBe(403)
  expect((await client('POST', `/api/join/${tokenStr}`, {})).status).toBe(200)
  expect((await client('POST', `/api/join/${tokenStr}`, {})).status).toBe(404) // single use

  const links = (await owner('GET', '/api/studio/links')).body
  expect(links[0].status).toBe('active')

  // draft needs custom field to send
  const draft = { linkId: links[0].id, typeId: created.body.id, theme: 'onyx', items: [{ id: 'a', desc: 'Shoot', qty: 2, rate: 5000000 }], fields: {}, gstPct: 18, discount: 0, advance: 0, issued: new Date().toISOString(), due: new Date(Date.now() + 7 * 864e5).toISOString(), note: '' }
  const d = await owner('POST', '/api/studio/invoices', draft)
  expect((await owner('POST', `/api/studio/invoices/${d.body.id}/send`)).status).toBe(422)
  await owner('PUT', `/api/studio/invoices/${d.body.id}`, { ...draft, fields: { venue: 'Taj' } })
  const sent = await owner('POST', `/api/studio/invoices/${d.body.id}/send`)
  expect(sent.status).toBe(200)
  expect(sent.body.number).toMatch(/^SHT\/\d{4}-\d{2}\/0001$/)

  // sent invoices are immutable
  expect((await owner('PUT', `/api/studio/invoices/${d.body.id}`, draft)).status).toBe(409)

  // the right client sees it; a stranger and a logged-out user do not
  const mine = (await client('GET', '/api/slip/invoices')).body
  expect(mine.length).toBe(1)
  expect((await stranger('GET', `/api/slip/invoices/${d.body.id}`)).status).toBe(404)
  expect((await stranger('GET', `/api/studio/invoices/${d.body.id}`)).status).toBe(404)
  const view = await client('GET', `/api/slip/invoices/${d.body.id}`)
  expect(view.body.totals.total).toBe(11800000) // 2 x 50,000 + 18% GST, in paise

  // client says paid, owner confirms, status settles
  expect((await client('POST', `/api/slip/invoices/${d.body.id}/claim`, { amount: 11800000, ref: 'UPI123' })).status).toBe(200)
  const pending = (await owner('GET', `/api/studio/invoices/${d.body.id}`)).body.payments[0]
  expect(pending.status).toBe('claimed')
  expect((await owner('POST', `/api/studio/invoices/payments/${pending.id}/confirm`)).status).toBe(200)
  expect((await owner('GET', `/api/studio/invoices/${d.body.id}`)).body.status).toBe('paid')

  // both sides got notified and emailed
  expect(((await client('GET', '/api/notifications')).body as any[]).length).toBeGreaterThan(1)
  expect(((await client('GET', '/api/mailbox')).body as any[]).some((m) => m.subject.includes('Receipt'))).toBe(true)
  expect(((await owner('GET', '/api/notifications')).body as any[]).length).toBeGreaterThan(1)
})

test('connect by code needs approval when the owner turns auto-connect off', async () => {
  db.query('UPDATE businesses SET auto_approve = 0').run()
  const me = (await owner('GET', '/api/account/me')).body
  const slug = me.business.slug
  expect((await stranger('POST', '/api/slip/connections/connect', { code: `http://localhost:5173/c/${slug}` })).body.status).toBe('pending')
  const pend = ((await owner('GET', '/api/studio/links')).body as any[]).find((l) => l.status === 'pending')
  expect((await owner('POST', `/api/studio/links/${pend.id}/approve`)).status).toBe(200)
  expect(((await stranger('GET', '/api/slip/connections')).body.connections as any[])[0].status).toBe('active')
})

test('reminders fire once, on the due date', async () => {
  const links = (await owner('GET', '/api/studio/links')).body
  const types = (await owner('GET', '/api/studio/types')).body
  const now = new Date()
  const body = { linkId: links.find((l: any) => l.email === 'aarav@client.test').id, typeId: types[0].id, theme: 'onyx', items: [{ id: 'a', desc: 'Retainer', qty: 1, rate: 100000 }], fields: {}, gstPct: 0, discount: 0, advance: 0, issued: now.toISOString(), due: now.toISOString(), note: '' }
  const d = await owner('POST', '/api/studio/invoices', body)
  await owner('POST', `/api/studio/invoices/${d.body.id}/send`)
  const { runReminders } = await import('../src/reminders.ts')
  expect(await runReminders()).toBeGreaterThanOrEqual(1)
  expect(await runReminders()).toBe(0) // never twice
  const inv = (await client('GET', `/api/slip/invoices/${d.body.id}`)).body
  expect(inv.events.some((e: any) => e.kind === 'reminder')).toBe(true)
})

test('smart invoices: GSTIN check, IGST, tax inclusive, frozen details, duplicate, memory', async () => {
  // a typo in a GSTIN is rejected by the check digit
  const base = { name: 'Northlight Films', address: '', city: 'Mumbai', email: '', phone: '' }
  expect((await owner('PUT', '/api/studio', { ...base, gstin: '27AAPFU0939F1ZW' })).status).toBe(422)
  expect((await owner('PUT', '/api/studio', { ...base, gstin: '27AAPFU0939F1ZV', upiId: 'northlight@okhdfc', ifsc: 'HDFC0001234', accountNo: '50100012345678' })).status).toBe(200)
  expect((await owner('PUT', '/api/studio/signature', { kind: 'image', image: 'data:text/html;base64,AAAA' })).status).toBe(422)
  expect((await owner('PUT', '/api/studio/signature', { kind: 'typed', text: 'Riya Kapoor', font: 'allura' })).status).toBe(200)

  const links = (await owner('GET', '/api/studio/links')).body
  const aarav = links.find((l: any) => l.email === 'aarav@client.test')
  await owner('PATCH', `/api/studio/links/${aarav.id}`, { gstin: '29AAGCB7383J1Z4' }) // Karnataka
  const types = (await owner('GET', '/api/studio/types')).body
  const now = new Date()
  const body = { linkId: aarav.id, typeId: types[0].id, theme: 'classic', items: [{ id: 'a', desc: 'Brand film', qty: 1, rate: 11800000 }], fields: {}, gstPct: 18, discount: 0, advance: 0,
    issued: now.toISOString(), due: new Date(now.getTime() + 7 * 864e5).toISOString(), note: '', project: 'Monsoon brand film', terms: ['Payment within {due_days} days.'], taxInclusive: true }
  const d = await owner('POST', '/api/studio/invoices', body)
  const draft = (await owner('GET', `/api/studio/invoices/${d.body.id}`)).body
  expect(draft.interState).toBe(true) // Maharashtra to Karnataka takes IGST
  expect(draft.totals.total).toBe(11800000) // price already includes GST
  expect(draft.totals.taxable).toBe(10000000)
  expect(draft.terms).toEqual(['Payment within {due_days} days.'])
  expect(draft.project).toBe('Monsoon brand film')

  await owner('POST', `/api/studio/invoices/${d.body.id}/send`)
  await owner('PUT', '/api/studio', { ...base, name: 'Renamed Studio', gstin: '27AAPFU0939F1ZV' })
  const sent = (await client('GET', `/api/slip/invoices/${d.body.id}`)).body
  expect(sent.from.name).toBe('Northlight Films') // sent invoices keep the details they were sent with
  expect(sent.from.upiId).toBe('northlight@okhdfc')

  const dup = await owner('POST', `/api/studio/invoices/${d.body.id}/duplicate`)
  const copy = (await owner('GET', `/api/studio/invoices/${dup.body.id}`)).body
  expect(copy.rawStatus).toBe('draft')
  expect(copy.number).toBeNull()
  expect(copy.items[0].desc).toBe('Brand film')

  const memory = (await owner('GET', '/api/studio/invoices/items/suggest')).body
  expect(memory.some((m: any) => m.desc === 'Brand film' && m.rate === 11800000)).toBe(true)
  const sum = (await owner('GET', '/api/studio/invoices/summary/all')).body
  expect(sum.outstanding).toBeGreaterThan(0)
  expect((await owner('GET', '/api/studio/stats')).body.months.length).toBe(12)
})

test('logos, client details, extras and void', async () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  expect((await owner('PUT', '/api/studio/logo', { image: png, size: 'l' })).status).toBe(200)
  expect((await owner('PUT', '/api/studio/logo', { image: 'data:image/svg+xml;base64,PHN2Zz4=', size: 'l' })).status).toBe(422)
  expect((await client('PUT', '/api/account/logo', { image: png })).status).toBe(200)
  const links = (await owner('GET', '/api/studio/links')).body
  const aarav = links.find((l: any) => l.email === 'aarav@client.test')
  expect(aarav.logo).toBe(png) // the client's own logo shows on the business side
  expect((await owner('PATCH', `/api/studio/links/${aarav.id}`, { honorific: 'Mr.', attention: 'Aarav Mehta', pin: '400050' })).status).toBe(200)
  expect((await owner('PATCH', `/api/studio/links/${aarav.id}`, { pin: '12' })).status).toBe(422)
  const types = (await owner('GET', '/api/studio/types')).body
  const now = new Date()
  const extra = { currency: 'USD', category: 'Video', plan: { kind: 'advance_balance', advancePct: 40 }, banner: 'Invoice towards a brand film', showQr: false, annexure: 'Scope: two shoot days.' }
  const d = await owner('POST', '/api/studio/invoices', { linkId: aarav.id, typeId: types[0].id, theme: 'corporate', items: [{ id: 'a', desc: 'Film', qty: 1, rate: 500000, unit: 'Package' }], fields: {}, gstPct: 0, discount: 0, advance: 0, issued: now.toISOString(), due: now.toISOString(), note: '', extra })
  expect(d.status).toBe(200)
  const inv = (await owner('GET', `/api/studio/invoices/${d.body.id}`)).body
  expect(inv.extra.currency).toBe('USD')
  expect(inv.extra.plan.advancePct).toBe(40)
  expect(inv.extra.showBank).toBe(true) // defaults filled in
  expect(inv.items[0].unit).toBe('Package')
  expect(inv.billTo.honorific).toBe('Mr.')
  expect(inv.billTo.logo).toBe(png)
  await owner('POST', `/api/studio/invoices/${d.body.id}/send`)
  expect((await owner('POST', `/api/studio/invoices/${d.body.id}/void`, {})).status).toBe(422)
  expect((await owner('POST', `/api/studio/invoices/${d.body.id}/void`, { message: 'Wrong client' })).status).toBe(200)
  const v = (await client('GET', `/api/slip/invoices/${d.body.id}`)).body
  expect(v.status).toBe('void')
  expect(v.voidReason).toBe('Wrong client')
  expect((await owner('POST', `/api/studio/invoices/${d.body.id}/payments`, { amount: 100, method: 'upi', ref: '' })).status).toBe(409)
})

test('payment kinds and refunds keep the balance right', async () => {
  const links = (await owner('GET', '/api/studio/links')).body
  const aarav = links.find((l: any) => l.email === 'aarav@client.test')
  const types = (await owner('GET', '/api/studio/types')).body
  const now = new Date().toISOString()
  const d = await owner('POST', '/api/studio/invoices', { linkId: aarav.id, typeId: types[1].id, theme: 'classic', items: [{ id: 'a', desc: 'Work', qty: 1, rate: 1000000 }], fields: {}, gstPct: 0, discount: 0, advance: 0, issued: now, due: now, note: '' })
  await owner('POST', `/api/studio/invoices/${d.body.id}/send`)
  const pay = (body: object) => owner('POST', `/api/studio/invoices/${d.body.id}/payments`, { method: 'upi', ref: '', ...body })
  expect((await pay({ amount: 900000, kind: 'payment', note: 'First part' })).status).toBe(200)
  expect((await pay({ amount: 100000, kind: 'tds' })).status).toBe(200)
  let inv = (await owner('GET', `/api/studio/invoices/${d.body.id}`)).body
  expect(inv.status).toBe('paid')
  expect((await pay({ amount: 2000000, kind: 'refund' })).status).toBe(422) // cannot refund more than was paid
  expect((await pay({ amount: 200000, kind: 'refund', note: 'Returned for a cancelled day' })).status).toBe(200)
  inv = (await owner('GET', `/api/studio/invoices/${d.body.id}`)).body
  expect(inv.totals.balance).toBe(200000)
  expect(inv.status).not.toBe('paid')
  expect(inv.payments.some((p: any) => p.kind === 'tds')).toBe(true)
})

test('a recorded payment can be corrected or removed, and the history stays', async () => {
  const links = (await owner('GET', '/api/studio/links')).body
  const aarav = links.find((l: any) => l.email === 'aarav@client.test')
  const types = (await owner('GET', '/api/studio/types')).body
  const now = new Date().toISOString()
  const d = await owner('POST', '/api/studio/invoices', { linkId: aarav.id, typeId: types[1].id, theme: 'classic', items: [{ id: 'a', desc: 'Work', qty: 1, rate: 500000 }], fields: {}, gstPct: 0, discount: 0, advance: 0, issued: now, due: new Date(Date.now() + 30 * 86_400_000).toISOString(), note: '' })
  await owner('POST', `/api/studio/invoices/${d.body.id}/send`)
  const id = d.body.id
  expect((await owner('POST', `/api/studio/invoices/${id}/payments`, { amount: 500000, method: 'upi', ref: 'X1', kind: 'payment' })).status).toBe(200)
  let inv = (await owner('GET', `/api/studio/invoices/${id}`)).body
  expect(inv.status).toBe('paid')
  const pid = inv.payments[0].id
  // correct the amount down: the invoice is partly paid again, and it is logged
  expect((await owner('PUT', `/api/studio/invoices/payments/${pid}`, { amount: 300000, method: 'bank', ref: 'X1', note: 'Typo', paidAt: now })).status).toBe(200)
  inv = (await owner('GET', `/api/studio/invoices/${id}`)).body
  expect(inv.totals.balance).toBe(200000)
  expect(inv.status).toBe('partial')
  expect(inv.events.some((e: any) => e.kind === 'payment_edit')).toBe(true)
  // cannot be edited past the invoice total
  expect((await owner('PUT', `/api/studio/invoices/payments/${pid}`, { amount: 900000, method: 'bank', ref: '', note: '', paidAt: now })).status).toBe(422)
  // remove it: balance is back, the row stays marked removed with its reason
  expect((await owner('POST', `/api/studio/invoices/payments/${pid}/void`, { reason: 'Bounced' })).status).toBe(200)
  inv = (await owner('GET', `/api/studio/invoices/${id}`)).body
  expect(inv.totals.balance).toBe(500000)
  expect(inv.status).toBe('sent')
  const gone = inv.payments.find((p: any) => p.id === pid)
  expect(gone.status).toBe('voided')
  expect(gone.voidReason).toBe('Bounced')
  expect(inv.events.some((e: any) => e.kind === 'payment_void')).toBe(true)
  // a removed payment cannot be edited again
  expect((await owner('PUT', `/api/studio/invoices/payments/${pid}`, { amount: 100, method: 'upi', ref: '', note: '', paidAt: now })).status).toBe(404)
})

test('statistics and quotation conversion', async () => {
  const links = (await owner('GET', '/api/studio/links')).body
  const types = (await owner('GET', '/api/studio/types')).body
  const quoteType = types.find((t: any) => t.schema?.prefix === 'QTN' || t.name === 'Quotation')
  expect(quoteType).toBeTruthy()
  const now = new Date().toISOString()
  const q = await owner('POST', '/api/studio/invoices', { linkId: links[0].id, typeId: quoteType.id, theme: 'classic', items: [{ id: 'a', desc: 'Plan', qty: 1, rate: 500000 }], fields: {}, gstPct: 18, discount: 0, advance: 0, issued: now, due: now, note: '' })
  await owner('POST', `/api/studio/invoices/${q.body.id}/send`)
  let s = (await owner('GET', '/api/studio/stats')).body
  expect(s.quotes).toEqual({ sent: 1, converted: 0 })
  expect(s.months.length).toBe(12)
  expect(s.totals.invoiced).toBeGreaterThan(0)
  expect(s.gst.cgst + s.gst.sgst + s.gst.igst).toBeGreaterThan(0)
  const conv = await owner('POST', `/api/studio/invoices/${q.body.id}/duplicate?as=invoice`)
  const draft = (await owner('GET', `/api/studio/invoices/${conv.body.id}`)).body
  expect(draft.type.prefix).not.toBe('QTN')
  await owner('POST', `/api/studio/invoices/${conv.body.id}/send`)
  s = (await owner('GET', '/api/studio/stats')).body
  expect(s.quotes.converted).toBe(1)
  expect((await stranger('GET', '/api/studio/stats')).body.totals.count).toBe(0) // a client account sees nothing
})

test('automation: settings, late fee draft, monthly repeat, reminders off', async () => {
  const { runRecurring, lateFeeFor, rulesFor } = await import('../src/automation.ts')
  expect((await owner('PUT', '/api/studio/automation', { reminders: { before: [3], onDue: true, afterEvery: 7 }, lateFee: { kind: 'percent', pct: 9, flat: 0, graceDays: 0 } })).status).toBe(422) // over 5% a month
  expect((await owner('PUT', '/api/studio/automation', { reminders: { before: [3], onDue: true, afterEvery: 7 }, lateFee: { kind: 'percent', pct: 2, flat: 0, graceDays: 5 } })).status).toBe(200)
  expect((await owner('GET', '/api/studio/automation')).body.lateFee.pct).toBe(2)
  // 2% per started month after 5 grace days: 40 days late -> 35 counted -> 2 months -> 4%
  expect(lateFeeFor({ kind: 'percent', pct: 2, flat: 0, graceDays: 5 }, 100000, new Date(Date.now() - 40 * 864e5).toISOString())).toBe(4000)
  expect(rulesFor(JSON.stringify({ remindersOff: true }), null, null)).toBeNull()
  expect(rulesFor(JSON.stringify({ reminders: { before: [1], onDue: false, afterEvery: null } }), '{"before":[5]}', null)?.before).toEqual([1])

  const links = (await owner('GET', '/api/studio/links')).body
  const types = (await owner('GET', '/api/studio/types')).body
  const old = (d: number) => new Date(Date.now() - d * 864e5).toISOString()
  const d = await owner('POST', '/api/studio/invoices', { linkId: links[0].id, typeId: types[1].id, theme: 'classic', items: [{ id: 'a', desc: 'Retainer', qty: 1, rate: 1000000 }], fields: {}, gstPct: 0, discount: 0, advance: 0, issued: old(45), due: old(40), note: '', extra: { repeat: 'monthly' } })
  await owner('POST', `/api/studio/invoices/${d.body.id}/send`)
  expect((await owner('GET', `/api/studio/automation/late-fee/${d.body.id}`)).body.amount).toBe(40000)
  const fee = await owner('POST', `/api/studio/automation/late-fee/${d.body.id}`)
  expect(fee.status).toBe(200)
  const feeInv = (await owner('GET', `/api/studio/invoices/${fee.body.id}`)).body
  expect(feeInv.items[0].rate).toBe(40000)
  expect(feeInv.status).toBe('draft')
  expect((await stranger('POST', `/api/studio/automation/late-fee/${d.body.id}`)).status).not.toBe(200)

  expect(runRecurring()).toBe(1)
  expect(runRecurring()).toBe(0) // once only
})


test('acceptance: asked only when chosen, client signs once, both are told; PDF-only stays out of the inbox', async () => {
  const links = (await owner('GET', '/api/studio/links')).body
  const types = (await owner('GET', '/api/studio/types')).body
  const aarav = links.find((l: any) => l.email === 'aarav@client.test')
  const mk = async () => (await owner('POST', '/api/studio/invoices', { linkId: aarav.id, typeId: types[1].id, theme: 'classic', items: [{ id: 'a', desc: 'Work', qty: 1, rate: 100000 }], fields: {}, gstPct: 0, discount: 0, advance: 0, issued: new Date().toISOString(), due: new Date(Date.now() + 864e5).toISOString(), note: '' })).body.id as string
  const a = await mk()
  expect((await owner('POST', `/api/studio/invoices/${a}/send`, { delivery: 'shakeslip', needsAccept: true })).status).toBe(200)
  expect((await owner('GET', `/api/studio/invoices/${a}`)).body.acceptance.required).toBe(true)
  expect((await stranger('POST', `/api/slip/invoices/${a}/accept`, { name: 'Eve Evil' })).status).toBe(404) // not their invoice
  expect((await client('POST', `/api/slip/invoices/${a}/accept`, { name: 'A' })).status).toBe(422) // needs a real name
  expect((await client('POST', `/api/slip/invoices/${a}/accept`, { name: 'Aarav Mehta', signature: 'javascript:alert(1)' })).status).toBe(422)
  expect((await client('POST', `/api/slip/invoices/${a}/accept`, { name: 'Aarav Mehta' })).status).toBe(200)
  expect((await client('POST', `/api/slip/invoices/${a}/accept`, { name: 'Aarav Mehta' })).status).toBe(409) // once only
  const seen = (await owner('GET', `/api/studio/invoices/${a}`)).body
  expect(seen.acceptance.at).toBeTruthy()
  expect(seen.events.some((e: any) => e.kind === 'accepted')).toBe(true)
  expect(((await owner('GET', '/api/notifications')).body.items ?? (await owner('GET', '/api/notifications')).body).some((n: any) => /accepted/.test(n.title))).toBe(true)
  expect(((await client('GET', '/api/notifications')).body.items ?? (await client('GET', '/api/notifications')).body).some((n: any) => /You accepted/.test(n.title))).toBe(true)

  const b = await mk()
  await owner('POST', `/api/studio/invoices/${b}/send`, { delivery: 'shakeslip', needsAccept: false })
  expect((await client('POST', `/api/slip/invoices/${b}/accept`, { name: 'Aarav Mehta' })).status).toBe(409) // never asked for

  const c = await mk()
  expect((await owner('POST', `/api/studio/invoices/${c}/send`, { delivery: 'pdf', needsAccept: true })).status).toBe(200)
  expect((await owner('GET', `/api/studio/invoices/${c}`)).body.acceptance.required).toBe(false) // a PDF cannot be signed in the app
  expect((await client('GET', `/api/slip/invoices/${c}`)).status).toBe(404) // not in their inbox
  expect((await client('GET', '/api/slip/invoices')).body.some((r: any) => r.id === c)).toBe(false)
})

test('change requests carry numbered marks; "payment done" records how they paid', async () => {
  const links = (await owner('GET', '/api/studio/links')).body
  const types = (await owner('GET', '/api/studio/types')).body
  const aarav = links.find((l: any) => l.email === 'aarav@client.test')
  const id = (await owner('POST', '/api/studio/invoices', { linkId: aarav.id, typeId: types[1].id, theme: 'classic', items: [{ id: 'a', desc: 'Work', qty: 1, rate: 100000 }], fields: {}, gstPct: 0, discount: 0, advance: 0, issued: new Date().toISOString(), due: new Date(Date.now() + 864e5).toISOString(), note: '' })).body.id as string
  await owner('POST', `/api/studio/invoices/${id}/send`, {})
  expect((await client('POST', `/api/slip/invoices/${id}/request-change`, {})).status).toBe(422) // nothing said
  expect((await client('POST', `/api/slip/invoices/${id}/request-change`, { pins: [{ page: 0, x: 120, y: 5, text: 'x' }] })).status).toBe(422) // off the page
  expect((await stranger('POST', `/api/slip/invoices/${id}/request-change`, { message: 'hi' })).status).toBe(404)
  expect((await client('POST', `/api/slip/invoices/${id}/request-change`, { pins: [{ page: 0, x: 40.5, y: 22, text: 'Wrong GSTIN' }, { page: 0, x: 80, y: 60, text: 'Rate is too high' }] })).status).toBe(200)
  const seen = (await owner('GET', `/api/studio/invoices/${id}`)).body
  expect(seen.annotations.length).toBe(2)
  expect(seen.annotations[0].text).toBe('Wrong GSTIN')
  expect((await client('POST', `/api/slip/invoices/${id}/claim`, { amount: 100000, ref: '', method: 'card' })).status).toBe(200)
  expect((await owner('GET', `/api/studio/invoices/${id}`)).body.payments[0].method).toBe('card')
  expect((await client('POST', `/api/slip/invoices/${id}/claim`, { amount: 1, ref: '', method: 'bitcoin' })).status).toBe(422)
})

test('service catalogue: rates and packages, own services only', async () => {
  const cat = { services: [{ id: 's1', name: 'Shoot day', unit: 'day', rate: 2500000 }, { id: 's2', name: 'Edit', unit: 'video', rate: 1500000 }], packages: [{ id: 'p1', name: 'Wedding film', price: 3500000, includes: ['s1', 's2', 'not-mine'] }] }
  expect((await owner('PUT', '/api/studio/catalogue', cat)).status).toBe(200)
  const me = (await owner('GET', '/api/account/me')).body
  expect(me.business.catalogue.services.length).toBe(2)
  expect(me.business.catalogue.packages[0].includes).toEqual(['s1', 's2'])
  expect((await owner('PUT', '/api/studio/catalogue', { services: [{ id: 'x', name: '', rate: 1 }], packages: [] })).status).toBe(422)
  expect((await stranger('PUT', '/api/studio/catalogue', cat)).status).not.toBe(200)
})

test('password reset works once and signs out old sessions', async () => {
  const a = agent()
  expect((await a('POST', '/api/account/forgot', { email: 'nobody@nowhere.test' })).status).toBe(200) // same answer for unknown emails
  await a('POST', '/api/account/forgot', { email: 'riya@studio.test' })
  const mail = db.query("SELECT link FROM outbox WHERE to_email = 'riya@studio.test' AND subject LIKE 'Reset%'").get() as { link: string }
  const tok = mail.link.split('/reset/')[1]
  expect((await a('POST', '/api/account/reset', { token: tok, password: 'a-brand-new-password' })).status).toBe(200)
  expect((await a('POST', '/api/account/reset', { token: tok, password: 'another-password-x' })).status).toBe(404)
  expect((await owner('GET', '/api/account/me')).body.user).toBeNull()
})

test('login is rate limited and passwords are hashed', async () => {
  const a = agent()
  let last = 0
  for (let i = 0; i < 7; i++) last = (await a('POST', '/api/account/login', { email: 'riya@studio.test', password: 'wrong-password' })).status
  expect(last).toBe(429)
  const row = db.query('SELECT password_hash FROM users LIMIT 1').get() as { password_hash: string }
  expect(row.password_hash.startsWith('$argon2id$')).toBe(true)
})

test('writing templates are private to each business and support formatted documents', async () => {
  const a = agent(), b = agent()
  for (const [who, email] of [[a, 'templates-a@test.example'], [b, 'templates-b@test.example']] as const) {
    expect((await who('POST', '/api/account/signup', { name: 'Template tester', email, password: pw, role: 'studio', acceptTerms: true })).status).toBe(200)
    expect((await who('POST', '/api/studio', { name: 'Template test business', gstin: '', address: '', city: '', email: '', phone: '' })).status).toBe(200)
  }
  const content = 'ssdoc:1:' + JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Keep this bold', marks: [{ type: 'bold' }] }] }] })
  const created = await a('POST', '/api/studio/document-templates', { name: 'Payment terms', kind: 'terms', content })
  expect(created.status).toBe(200)
  expect((await b('GET', '/api/studio/document-templates')).body).toEqual([])
  await b('DELETE', `/api/studio/document-templates/${created.body.id}`)
  expect((await a('GET', '/api/studio/document-templates')).body[0].content).toBe(content)
  expect((await a('POST', '/api/studio/document-templates', { name: '', kind: 'terms', content })).status).toBe(422)
  await a('DELETE', `/api/studio/document-templates/${created.body.id}`)
  expect((await a('GET', '/api/studio/document-templates')).body).toEqual([])
})

test('additional client contacts validate, persist and freeze on sent invoices', async () => {
  const a = agent()
  await a('POST', '/api/account/signup', { name: 'Contact tester', email: 'contacts@test.example', password: pw, role: 'studio', acceptTerms: true })
  await a('POST', '/api/studio', { name: 'Contacts studio', gstin: '', address: '', city: '', email: '', phone: '' })
  const emails = [{ id: 'billing', label: 'Billing', address: 'billing@test.example', isDefault: true }]
  const phones = [{ id: 'office', label: 'Office', number: '+91 9999999999', isDefault: true }]
  const profile = { name: 'Contact tester', phone: '', company: '', gstin: '', address: '', city: '', pin: '', emails, phones }
  expect((await a('PUT', '/api/account/me', profile)).status).toBe(200)
  expect((await a('GET', '/api/account/me')).body.profile.emails).toEqual(emails)
  expect((await a('PUT', '/api/account/me', { ...profile, emails: [{ ...emails[0], address: 'javascript:bad' }] })).status).toBe(422)
  const invited = await a('POST', '/api/studio/links/invite', { name: 'Client', email: 'client-contacts@test.example', phone: '', groupId: null, phones, emails })
  expect(invited.status).toBe(200)
  const type = (await a('GET', '/api/studio/types')).body[0]
  const doc = 'ssdoc:1:' + JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rich terms', marks: [{ type: 'bold' }] }] }] })
  const draft = await a('POST', '/api/studio/invoices', { linkId: invited.body.id, typeId: type.id, theme: 'classic', items: [{ id: 'line', desc: 'Work', qty: 1, rate: 10000 }], fields: {}, gstPct: 0, discount: 0, advance: 0, issued: new Date().toISOString(), due: new Date().toISOString(), note: '', extra: { customTerms: doc, clientEmailIds: ['billing'] } })
  expect(draft.status).toBe(200)
  expect((await a('POST', `/api/studio/invoices/${draft.body.id}/send`, { delivery: 'pdf' })).status).toBe(200)
  await a('PATCH', `/api/studio/links/${invited.body.id}`, { emails: [{ ...emails[0], address: 'changed@test.example' }] })
  const saved = (await a('GET', `/api/studio/invoices/${draft.body.id}`)).body
  expect(saved.billTo.emails).toEqual(emails)
  expect(saved.extra.customTerms).toBe(doc)
  expect(saved.extra.clientEmailIds).toEqual(['billing'])
})

test('account deletion requires explicit confirmation and revokes the session', async () => {
  const a = agent()
  await a('POST', '/api/account/signup', { name: 'Deletion tester', email: 'delete-confirm@test.example', password: pw, role: 'slip', acceptTerms: true })
  expect((await a('POST', '/api/account/me/delete')).status).toBe(422)
  expect((await a('GET', '/api/account/me')).body.user).not.toBeNull()
  expect((await a('POST', '/api/account/me/delete', { confirmation: 'DELETE' })).status).toBe(200)
  expect((await a('GET', '/api/account/me')).body.user).toBeNull()
})
