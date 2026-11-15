import { db } from './db.ts'

/* One person, one set of details. Studio (the business) and Slip (the client profile) are two views of the same account,
   so anything filled in on one side fills the matching empty fields on the other. It never overwrites something already written. */
type Row = Record<string, string | null>
const blank = (v: unknown) => v == null || String(v).trim() === ''

export function syncShared(userId: string) {
  const u = db.query('SELECT phone FROM users WHERE id = ?').get(userId) as { phone: string } | null
  const p = db.query('SELECT company,gstin,address,city,pin,state,pan FROM client_profiles WHERE user_id = ?').get(userId) as Row | null
  const b = db.query('SELECT id,name,gstin,address,city,state,pan,phone FROM businesses WHERE owner_id = ?').get(userId) as Row | null
  if (!u || !p || !b) return
  const toProfile: [string, unknown][] = [['company', b.name], ['gstin', b.gstin], ['address', b.address], ['city', b.city], ['state', b.state], ['pan', b.pan]]
  for (const [col, val] of toProfile) if (blank(p[col]) && !blank(val)) db.query(`UPDATE client_profiles SET ${col} = ? WHERE user_id = ?`).run(String(val), userId)
  const toBiz: [string, unknown][] = [['gstin', p.gstin], ['address', p.address], ['city', p.city], ['state', p.state], ['pan', p.pan], ['phone', u.phone]]
  for (const [col, val] of toBiz) if (blank(b[col]) && !blank(val)) db.query(`UPDATE businesses SET ${col} = ? WHERE id = ?`).run(String(val), b.id)
  if (blank(u.phone) && !blank(b.phone)) db.query('UPDATE users SET phone = ? WHERE id = ?').run(String(b.phone), userId)
}
