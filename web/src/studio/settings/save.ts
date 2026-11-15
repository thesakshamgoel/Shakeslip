import { put } from '../../lib/api'
import type { Me } from '../../lib/types'

/* The business endpoint takes the whole profile; merge the section's changes into what we have. */
export function saveBusiness(me: Me, patch: Record<string, unknown>) {
  const b = me.business!
  return put('/studio', { name: b.name, gstin: b.gstin, pan: b.pan ?? '', address: b.address, city: b.city, state: b.state ?? '', email: b.email, phone: b.phone, website: b.website ?? '',
    upiId: b.upiId ?? '', bankName: b.bankName ?? '', accountName: b.accountName ?? '', accountNo: b.accountNo ?? '', ifsc: b.ifsc ?? '', profession: b.profession, autoApprove: b.autoApprove, ...patch })
}
