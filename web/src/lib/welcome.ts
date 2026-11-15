/* The welcome greeting plays after signing in, and when you come back after a long time away.
   Not on every page load: quick returns go straight to your work. */
const FLAG = 'ss-welcome', SEEN = 'ss-last-seen', AWAY = 6 * 3_600_000
export const markLogin = () => { try { sessionStorage.setItem(FLAG, '1'); localStorage.setItem('ss-visited', '1') } catch { /* storage may be off */ } }
export function takeWelcome(): boolean {
  try {
    const fresh = sessionStorage.getItem(FLAG) === '1'
    sessionStorage.removeItem(FLAG)
    const last = Number(localStorage.getItem(SEEN) ?? 0)
    localStorage.setItem(SEEN, String(Date.now()))
    return fresh || !last || Date.now() - last > AWAY
  } catch { return false }
}
export const touchSeen = () => { try { localStorage.setItem(SEEN, String(Date.now())) } catch { /* storage may be off */ } }
export const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Working late' }
