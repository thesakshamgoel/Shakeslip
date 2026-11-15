import { Banknote, BellRing, CheckCheck, Eye, FilePlus2, HandCoins, Mail, MessageCircle, MessageSquareWarning, PenLine, UserCheck, type LucideIcon } from 'lucide-react'
import type { EventKind, TimelineEvent } from '../lib/types'
import { fmtDateTime } from '../lib/dates'
import './page.css'

const ICON: Record<EventKind, { icon: LucideIcon; tone: string }> = {
  created: { icon: FilePlus2, tone: '' }, sent: { icon: Mail, tone: 'info' }, whatsapp: { icon: MessageCircle, tone: 'ok' }, viewed: { icon: Eye, tone: 'info' },
  reminder: { icon: BellRing, tone: 'warn' }, payment: { icon: Banknote, tone: 'ok' }, claimed: { icon: HandCoins, tone: 'warn' }, confirmed: { icon: CheckCheck, tone: 'ok' },
  details: { icon: UserCheck, tone: 'info' }, accepted: { icon: PenLine, tone: 'ok' }, change: { icon: MessageSquareWarning, tone: 'warn' },
}

export function Feed({ events, showWho }: { events: TimelineEvent[]; showWho?: 'number' | 'from' }) {
  if (!events.length) return <div className="empty" style={{ padding: 'var(--s-8) var(--s-4)' }}><p>Nothing yet. Updates show up here as they happen.</p></div>
  return (
    <div className="feed">
      {events.map((e, i) => {
        const m = ICON[e.kind] ?? ICON.created
        const who = showWho === 'from' ? e.from : showWho === 'number' ? e.number : ''
        return (
          <div className="feed-i" key={i}>
            <span className={`feed-ic ${m.tone}`}><m.icon size={14} aria-hidden /></span>
            <p>{who ? <b>{who}: </b> : null}{e.text}</p>
            <small>{fmtDateTime(e.at)}</small>
          </div>
        )
      })}
    </div>
  )
}
