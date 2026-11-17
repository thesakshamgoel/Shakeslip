import { navBlocked } from '../lib/navguard'
import { AnimatePresence, motion } from 'motion/react'
import { CornerDownLeft, FileText, Search, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../lib/api'
import { inr } from '../lib/money'
import { snappy, springSoft } from '../lib/motion'
import type { InvoiceRow, Link } from '../lib/types'
import type { NavItem } from './AppShell'
import './palette.css'

type Item = { id: string; label: string; hint?: string; icon: LucideIcon; to: string; group: string }

/* Cmd/Ctrl + K: jump anywhere, find any invoice or client, start common actions. */
export function CommandPalette({ app, actions }: { app: 'studio' | 'slip'; actions: NavItem[] }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const [data, setData] = useState<{ inv: InvoiceRow[]; links: Link[] }>({ inv: [], links: [] })
  const nav = useNavigate()
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o) } }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey); window.addEventListener('open-palette', onOpen)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('open-palette', onOpen) }
  }, [])
  useEffect(() => {
    if (!open) return
    setQ(''); setI(0)
    const prev = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    setTimeout(() => input.current?.focus(), 30)
    Promise.all([get<InvoiceRow[]>(`/${app}/invoices`).catch(() => []), app === 'studio' ? get<Link[]>('/studio/links').catch(() => []) : Promise.resolve([])]).then(([inv, links]) => setData({ inv, links }))
    return () => { document.body.style.overflow = ''; prev?.focus() }
  }, [open, app])

  const items = useMemo<Item[]>(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    const hit = (s: string) => words.every((w) => s.toLowerCase().includes(w))
    const acts: Item[] = actions.map((a) => ({ id: a.to, label: a.label, icon: a.icon, to: a.to, group: 'Go to' }))
    const inv: Item[] = data.inv.map((r) => ({ id: r.id, label: `${r.number ?? 'Draft'} · ${r.client ?? r.from ?? ''}`, hint: inr(r.status === 'draft' ? r.total : r.balance), icon: FileText, to: r.status === 'draft' ? `/studio/invoices/${r.id}/edit` : `/${app}/invoices/${r.id}`, group: 'Invoices' }))
    const cl: Item[] = data.links.map((l) => ({ id: l.id, label: l.company || l.name, hint: 'New invoice', icon: Users, to: `/studio/new?client=${l.id}`, group: 'Clients' }))
    const all = [...acts, ...cl, ...inv].filter((x) => !words.length || hit(`${x.label} ${x.group}`))
    return all.slice(0, 14)
  }, [q, data, actions, app])

  /* wait for the Enter key to finish, or it would land on the leave prompt that may open */
  function go(it?: Item) { if (!it) return; setOpen(false); const to = it.to; setTimeout(() => { if (!navBlocked(to)) nav(to) }, 60) }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="pal-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <motion.div className="pal" role="dialog" aria-modal="true" aria-label="Search and commands" initial={{ opacity: 0, scale: 0.96, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -6 }} transition={springSoft}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false)
              else if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(items.length - 1, x + 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)) }
              else if (e.key === 'Enter') go(items[i])
              else if (e.key === 'Tab') e.preventDefault()
            }}>
            <label className="pal-in"><Search size={18} aria-hidden /><input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setI(0) }} placeholder={app === 'studio' ? 'Search invoices, clients, or jump to a page' : 'Search invoices or jump to a page'} aria-label="Search" /><kbd>esc</kbd></label>
            <ul className="pal-list" role="listbox">
              {items.length === 0 && <li className="pal-empty">Nothing matches "{q}".</li>}
              {items.map((it, n) => (
                <li key={it.group + it.id} role="option" aria-selected={n === i} className="pal-i" onMouseMove={() => setI(n)} onClick={() => go(it)}>
                  {n === i && <motion.span layoutId="pal-hl" className="pal-hl" transition={snappy} />}
                  <it.icon size={16} aria-hidden /><span className="trunc">{it.label}</span><small>{it.hint ?? it.group}</small>{n === i && <CornerDownLeft size={14} aria-hidden />}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
