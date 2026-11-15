import { Bell } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fmtDateTime } from '../lib/dates'
import { post } from '../lib/api'
import { useSession } from '../lib/session'
import type { Notice } from '../lib/types'
import { useApi } from '../lib/useApi'
import './page.css'

const local = (l: string) => { try { const u = new URL(l, location.origin); return u.pathname } catch { return '' } }

/* Updates for the signed-in person: new invoices, payments, reminders, connection requests. */
export default function Notifications() {
  const { data, loading } = useApi<Notice[]>('/notifications')
  const { refresh } = useSession()
  useEffect(() => { void post('/notifications/read').then(refresh) }, [refresh])
  return (
    <>
      <div className="ph"><div><h1>Updates</h1><p>Everything that happens on your invoices, newest first. Copies also go to your email.</p></div></div>
      {!loading && !data?.length ? <div className="empty"><Bell size={28} aria-hidden /><h3>You are all caught up</h3><p>New invoices, payments and reminders will appear here.</p></div> : (
        <div className="feed">
          {data?.map((n) => {
            const to = local(n.link)
            const body = (<><span className={`feed-ic ${n.readAt ? '' : 'info'}`}><Bell size={14} aria-hidden /></span><p><b>{n.title}</b><br /><span style={{ color: 'var(--text-2)' }}>{n.body}</span></p><small>{fmtDateTime(n.at)}</small></>)
            return to ? <Link key={n.id} to={to} className="feed-i tap">{body}</Link> : <div key={n.id} className="feed-i">{body}</div>
          })}
        </div>
      )}
    </>
  )
}
