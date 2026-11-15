import type { DocData } from '../components/InvoiceDocument'

/* A clearly fictional sample invoice used only to show the designs on the home page. */
export const sampleDoc = (theme: string): DocData => ({
  number: 'INV/2026-27/0042', theme,
  type: { name: 'Tax invoice', title: 'Tax invoice', prefix: 'INV', lineMode: 'qty_rate', descLabel: 'Description', qtyLabel: 'Days', rateLabel: 'Rate', taxMode: 'gst', defaultGst: 18, discount: false, advance: true, dueDays: 15, defaultNote: '', theme, fields: [] },
  billTo: { name: 'Aarav Mehta', company: 'Mehta Weddings', gstin: '', city: 'Mumbai', address: '', email: '', phone: '', state: '27' },
  from: { name: 'Northlight Films', gstin: '', address: '', city: 'Mumbai', email: 'hello@northlight.example', phone: '', state: '27', upiId: 'northlight@upi', accountName: 'Northlight Films', bankName: 'Sample Bank', accountNo: '000011112222', ifsc: 'SMPL0001234', signature: { kind: 'typed', text: 'Riya Kapoor', font: 'great-vibes' } },
  items: [{ id: 'a', desc: 'Cinematography, 2 shooters', qty: 2, rate: 6500000 }, { id: 'b', desc: 'Highlight film, 4K', qty: 1, rate: 4500000 }, { id: 'c', desc: 'Colour grading', qty: 1, rate: 1500000 }],
  fields: {}, gstPct: 18, issued: '2026-11-15T09:00:00Z', due: '2026-11-30T09:00:00Z', note: 'Thank you for choosing us.', project: 'Wedding film, December 2026',
  terms: [], taxInclusive: false, interState: false, status: 'paid',
  totals: { subtotal: 19000000, discount: 0, taxable: 19000000, gst: 3420000, total: 22420000, advance: 0, paid: 22420000, balance: 0 },
})
