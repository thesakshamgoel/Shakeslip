import { AnimatePresence, motion } from 'motion/react'
import { BellRing, Check, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, post } from '../lib/api'
import { ding } from '../lib/ding'
import { springSoft } from '../lib/motion'
import type { Notice } from '../lib/types'
import './popups.css'

type PLink = { id: string; name: string; status: string }
const path = (l: string) => { try { return new URL(l, location.origin).pathname } catch { return '' } }

/* New updates slide in at the top right with a soft chime. Connection requests stay until you answer them. */
export function Popups({ app }: { app: 'studio' | 'slip' }) {
  const [list, setList] = useState<Notice[]>([])
  const seen = useRef<Set<string> | null>(null)
  const [busy, setBusy] = useState('')
  const drop = useCallback((id: string) => setList((l) => l.filter((n) => n.id !== id)), [])

  useEffect(() => {
    let live = true
    const poll = async () => {
      if (seen.current && document.visibilityState !== 'visible') return
      try {
        const all = await api<Notice[]>('GET', '/notifications', undefined, true)
        if (!live) return
        if (!seen.current) { seen.current = new Set(all.map((n) => n.id)); return }
        const fresh = all.filter((n) => !seen.current!.has(n.id) && !n.readAt)
        fresh.forEach((n) => seen.current!.add(n.id))
        if (fresh.length) { setList((l) => [...fresh.slice(0, 3), ...l].slice(0, 4)); ding() }
      } catch { /* offline: try again next time */ }
    }
    void poll()
    const id = setInterval(poll, 8000)
    return () => { live = false; clearInterval(id) }
  }, [])

  useEffect(() => {
    const timers = list.filter((n) => !/wants to connect/.test(n.title)).map((n) => setTimeout(() => drop(n.id), 9000))
    return () => timers.forEach(clearTimeout)
  }, [list, drop])

  async function answer(n: Notice, ok: boolean) {
    if (busy) return
    setBusy(n.id)
    try {
      const who = n.title.replace(/ wants to connect$/, '')
      const links = await api<PLink[]>('GET', '/studio/links')
      const l = links.find((x) => x.status === 'pending' && x.name === who) ?? links.find((x) => x.status === 'pending')
      if (l) await post(`/studio/links/${l.id}/${ok ? 'approve' : 'decline'}`)
      drop(n.id)
    } catch { /* leave it on screen so they can try again from Clients */ } finally { setBusy('') }
  }

  return (
    <div className="pop-wrap" aria-live="polite">
      <AnimatePresence initial={false}>
        {list.map((n) => {
          const ask = app === 'studio' && /wants to connect/.test(n.title)
          const to = path(n.link)
          return (
            <motion.div key={n.id} layout className={`pop ${ask ? 'pop-ask' : ''}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={springSoft} role="status">
              <span className="pop-ic"><BellRing size={18} aria-hidden /></span>
              <div className="pop-t"><b>{n.title}</b><span>{n.body}</span>
                {ask ? <div className="pop-act"><button className="btn btn-primary" disabled={!!busy} onClick={() => answer(n, true)}><Check size={16} aria-hidden />Approve</button><button className="btn" disabled={!!busy} onClick={() => answer(n, false)}>Decline</button></div>
                  : to && <Link to={to} className="au-link" onClick={() => drop(n.id)}>View</Link>}
              </div>
              <button className="icon-btn" aria-label="Dismiss" onClick={() => drop(n.id)}><X size={16} /></button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
