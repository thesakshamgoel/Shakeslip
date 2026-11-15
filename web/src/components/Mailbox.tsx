import { Mail } from 'lucide-react'
import { fmtDateTime } from '../lib/dates'
import { useApi } from '../lib/useApi'
import './page.css'

type Mail = { id: string; subject: string; body: string; link: string; at: string }

/* Local testing only: the emails Shakeslip sent to your address. In production real email is sent and this page is off. */
export default function Mailbox() {
  const { data } = useApi<Mail[]>('/mailbox')
  return (
    <>
      <div className="ph"><div><h1>Test mailbox</h1><p>Emails sent to you appear here while testing locally. Add a Resend key in the server settings to send real email.</p></div></div>
      {!data?.length ? <div className="empty"><Mail size={28} aria-hidden /><h3>No emails yet</h3><p>Invites, receipts and reminders sent to your address show up here.</p></div> : (
        <div className="rows">
          {data.map((m) => (
            <article key={m.id} className="mail">
              <header><b>{m.subject}</b><small>{fmtDateTime(m.at)}</small></header>
              <p>{m.body}</p>
              {m.link && <a href={m.link.replace(location.origin, '')} className="au-link">{m.link}</a>}
            </article>
          ))}
        </div>
      )}
    </>
  )
}
