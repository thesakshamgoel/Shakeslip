import { gstinValid, STATES } from './gst'

/* Paste a signature block, a WhatsApp message or a letterhead; we pull out what we recognise. */
export type Parsed = Partial<{ name: string; company: string; email: string; phone: string; gstin: string; pan: string; pin: string; city: string; state: string; address: string }>

export function parseContact(raw: string): Parsed {
  const text = raw.replace(/\r/g, '')
  const out: Parsed = {}
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/); if (email) out.email = email[0].toLowerCase()
  const gst = text.toUpperCase().match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/); if (gst && gstinValid(gst[0])) { out.gstin = gst[0]; out.state = gst[0].slice(0, 2); out.pan = gst[0].slice(2, 12) }
  const pan = text.toUpperCase().match(/\b[A-Z]{5}\d{4}[A-Z]\b/); if (pan && !out.pan) out.pan = pan[0]
  const phone = text.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/); if (phone) out.phone = `+91 ${phone[0].replace(/\D/g, '').slice(-10).replace(/(\d{5})(\d{5})/, '$1 $2')}`
  const pin = text.match(/\b[1-9]\d{5}\b/g)?.find((p) => !out.phone?.replace(/\D/g, '').includes(p)); if (pin) out.pin = pin
  /* the city usually sits on the same line as the PIN: "Bengaluru 560038" or "Mumbai - 400050" */
  if (pin) { const ln = text.split('\n').find((l) => l.includes(pin) && !/@/.test(l)); const c = ln?.replace(pin, '').replace(/[-,|]/g, ' ').replace(/\s+/g, ' ').trim(); if (c && /^[A-Za-z .]{3,30}$/.test(c)) out.city = c }
  const lower = text.toLowerCase()
  const st = Object.entries(STATES).find(([, n]) => lower.includes(n.toLowerCase())); if (st && !out.state) out.state = st[0]
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const plain = lines.filter((l) => !/@|\d{5}|gstin|pan\b|phone|mobile|tel|email/i.test(l))
  const co = plain.find((l) => /\b(pvt|private|ltd|limited|llp|studio|films|design|solutions|enterprises|agency|co\.?|inc|weddings|cafe|trust)\b/i.test(l))
  if (co) out.company = co.replace(/^(company|business)\s*:\s*/i, '')
  const nm = plain.find((l) => l !== co && /^[A-Za-z.\s]{3,40}$/.test(l) && l.split(/\s+/).length <= 4)
  if (nm) out.name = nm.replace(/^(name|contact)\s*:\s*/i, '')
  const addr = lines.find((l) => /road|street|marg|nagar|floor|sector|lane|building|tower|plot|block|\d+,/i.test(l) && !/@/.test(l))
  if (addr) out.address = addr
  return out
}
