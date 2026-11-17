import { AnimatePresence, motion } from 'motion/react'
import { snappy } from '../lib/motion'
import { Check, ChevronUp, LogOut, Moon, Plus, Sun, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../lib/session'
import { useTheme } from '../lib/theme'
import './account.css'

/* Accounts this device has used, so switching is one tap. Only name, email and photo are kept here; never a password or a session. */
export type Remembered = { email: string; name: string; photo: string }
const KEY = 'ss-accounts'
const read = (): Remembered[] => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x) => x && typeof x.email === 'string').slice(0, 5) : [] } catch { return [] } }
const write = (l: Remembered[]) => { try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, 5))) } catch { /* storage may be off */ } }

export function useAccounts() {
  const { me } = useSession()
  const [list, setList] = useState<Remembered[]>(read)
  const u = me?.user
  useEffect(() => {
    if (!u) return
    const next = [{ email: u.email, name: u.name, photo: u.photo ?? '' }, ...read().filter((x) => x.email.toLowerCase() !== u.email.toLowerCase())]
    write(next); setList(next)
  }, [u?.email, u?.name, u?.photo]) // eslint-disable-line react-hooks/exhaustive-deps
  const forget = (email: string) => { const n = read().filter((x) => x.email !== email); write(n); setList(n) }
  return { list, forget, current: u?.email.toLowerCase() }
}

/* The profile photo, or the first letter when there is none or it fails to load. */
export function Avatar({ name, photo, size = 36 }: { name: string; photo?: string; size?: number }) {
  const [bad, setBad] = useState(false)
  useEffect(() => setBad(false), [photo])
  return (
    <span className="avatar av" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden>
      {photo && !bad ? <img src={photo} alt="" referrerPolicy="no-referrer" onError={() => setBad(true)} /> : (name.trim().slice(0, 1) || '?').toUpperCase()}
    </span>
  )
}

/* Switching signs this one out and opens sign-in with the chosen email filled in (or Google, one tap). */
function useSwitcher() {
  const { logout } = useSession()
  const nav = useNavigate()
  return {
    to: async (email?: string) => { await logout(); nav(`/login${email ? `?email=${encodeURIComponent(email)}` : ''}`, { replace: true }) },
    out: async () => { await logout(); nav('/', { replace: true }) },
  }
}

export function AccountRows({ onDone }: { onDone?: () => void }) {
  const { list, forget, current } = useAccounts()
  const sw = useSwitcher()
  const { theme, toggle } = useTheme()
  return (
    <div className="acc-rows">
      {list.map((a) => {
        const me = a.email.toLowerCase() === current
        return (
          <div key={a.email} className="acc-row">
            <button type="button" className="acc-pick tap" disabled={me} onClick={() => { onDone?.(); void sw.to(a.email) }} aria-label={me ? `${a.name}, signed in` : `Switch to ${a.name}`}>
              <Avatar name={a.name} photo={a.photo} size={36} />
              <span className="acc-t"><b className="trunc">{a.name}</b><small className="trunc">{a.email}</small></span>
              {me && <Check size={18} aria-hidden className="acc-ok" />}
            </button>
            {!me && <button type="button" className="acc-x tap" aria-label={`Remove ${a.name} from this device`} onClick={() => forget(a.email)}><X size={16} aria-hidden /></button>}
          </div>
        )
      })}
      <button type="button" className="acc-act tap" onClick={() => { onDone?.(); void sw.to() }}><Plus size={18} aria-hidden />Add another account</button>
      <button type="button" className="acc-act tap" onClick={toggle}>{theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
      <button type="button" className="acc-act tap" onClick={() => { onDone?.(); void sw.out() }}><LogOut size={18} aria-hidden />Sign out</button>
    </div>
  )
}

/* Desktop sidebar: your photo and full name on one line, opening the account list upward. */
export function AccountMenu() {
  const { me } = useSession()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', down); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key) }
  }, [open])
  const u = me?.user
  if (!u) return null
  return (
    <div className="acc" ref={box}>
      <AnimatePresence>
        {open && <motion.div className="acc-pop" role="menu" initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.12 } }} transition={snappy}><AccountRows onDone={() => setOpen(false)} /></motion.div>}
      </AnimatePresence>
      <button type="button" className="acc-btn tap" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Avatar name={u.name} photo={u.photo} size={36} />
        <span className="acc-t"><b className="trunc">{u.name}</b><small className="trunc">{u.email}</small></span>
        <ChevronUp size={16} aria-hidden className="acc-c" data-open={open} />
      </button>
    </div>
  )
}

export function AccountHeader() {
  const { me } = useSession()
  const u = me?.user
  if (!u) return null
  return <div className="acc-head"><Avatar name={u.name} photo={u.photo} size={52} /><span className="acc-t"><b className="trunc">{u.name}</b><small className="trunc">{u.email}</small></span></div>
}
