import { db, nowIso, uid } from './db.ts'
import type { TypeSchema } from './schemas.ts'

const base: Omit<TypeSchema, 'name' | 'title' | 'prefix'> = {
  lineMode: 'qty_rate', descLabel: 'Description', qtyLabel: 'Qty', rateLabel: 'Rate', taxMode: 'gst', defaultGst: 18,
  discount: true, advance: true, dueDays: 15, defaultNote: 'Thank you for your business.', theme: 'classic', fields: [], defaultTerms: [],
}

export const starterTypes: TypeSchema[] = [
  { ...base, name: 'Tax invoice', title: 'Tax invoice', prefix: 'INV' },
  { ...base, name: 'Simple bill', title: 'Invoice', prefix: 'BILL', lineMode: 'amount_only', taxMode: 'none', defaultGst: 0, discount: false, advance: false, dueDays: 7, theme: 'classic' },
  { ...base, name: 'Quotation', title: 'Quotation', prefix: 'QTN', advance: false, dueDays: 30, theme: 'classic', defaultNote: 'This quotation is valid until the date shown.',
    fields: [{ id: 'valid_until', label: 'Valid until', kind: 'date', required: false, place: 'top' }] },
  { ...base, name: 'Event services', title: 'Tax invoice', prefix: 'EVT', qtyLabel: 'Days', rateLabel: 'Day rate',
    fields: [
      { id: 'event_date', label: 'Event date', kind: 'date', required: true, place: 'top' },
      { id: 'venue', label: 'Venue', kind: 'text', required: false, place: 'top' },
      { id: 'deliverables', label: 'Deliverables', kind: 'longtext', required: false, place: 'bottom' },
    ] },
]

/* A friendly starting point so a new business is never looking at a blank screen. */
export function seedBusiness(businessId: string) {
  const ids = starterTypes.map((t) => {
    const id = uid()
    db.query('INSERT INTO invoice_types (id,business_id,name,schema,archived,created_at) VALUES (?,?,?,?,0,?)').run(id, businessId, t.name, JSON.stringify(t), nowIso())
    return id
  })
  db.query('INSERT INTO groups (id,business_id,name,type_id,theme,due_days,reminders,created_at) VALUES (?,?,?,?,?,?,?,?)').run(
    uid(), businessId, 'All clients', ids[0], '', 15, JSON.stringify({ before: [2], onDue: true, afterEvery: 7 }), nowIso())
}
