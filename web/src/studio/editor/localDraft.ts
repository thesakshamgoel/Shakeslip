import type { Draft } from './state'

/* Unsent work is kept in this browser as you type, so a refresh, a crash or a slip of the back button never loses it.
   It is cleared once the invoice is saved to your account or sent. Nothing leaves the device. */
export type Saved = { d: Draft; step: number; services: string[]; draftId: string | null; at: number; typeId: string; client: string }
const P = 'ss-draft-'
export const draftKey = (existingId: string | null | undefined, typeId: string) => `${P}${existingId ? `inv-${existingId}` : `new-${typeId}`}`

export function readDraft(key: string): Saved | null {
  try { const s = JSON.parse(localStorage.getItem(key) ?? 'null') as Saved | null; return s && s.d && Array.isArray(s.d.items) ? s : null } catch { return null }
}
export function writeDraft(key: string, s: Saved) { try { localStorage.setItem(key, JSON.stringify(s)) } catch { /* storage full or off: autosave to the account still runs */ } }
export function clearDraft(key: string) { try { localStorage.removeItem(key) } catch { /* nothing to clear */ } }
export function listDrafts(): { key: string; s: Saved }[] {
  const out: { key: string; s: Saved }[] = []
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(P) && k.includes('new-')) { const s = readDraft(k); if (s) out.push({ key: k, s }) } } } catch { /* storage off */ }
  return out.sort((a, b) => b.s.at - a.s.at)
}

/* Carried across "Change type" so nothing typed is lost. Lives only for this tab. */
const CARRY = 'ss-carry'
export const writeCarry = (d: Draft) => { try { sessionStorage.setItem(CARRY, JSON.stringify({ d, at: Date.now() })) } catch { /* nothing to carry */ } }
export function readCarry(): Draft | null {
  try { const c = JSON.parse(sessionStorage.getItem(CARRY) ?? 'null') as { d: Draft; at: number } | null; return c && Date.now() - c.at < 600_000 && Array.isArray(c.d.items) ? c.d : null } catch { return null }
}
export const clearCarry = () => { try { sessionStorage.removeItem(CARRY) } catch { /* nothing to clear */ } }
