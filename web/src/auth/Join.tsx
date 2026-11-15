import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { errText, post } from '../lib/api'
import { useApi } from '../lib/useApi'
import { useSession } from '../lib/session'
import { AuthLayout } from './AuthLayout'

type Preview = { business: { name: string; city: string }; name?: string; emailHint?: string; viewerSignedIn?: boolean }

/* One page for both ways of linking: an emailed invite (/join/:token) and a business's connect link (/c/:slug). */
export default function Join({ mode }: { mode: 'invite' | 'code' }) {
  const { token, slug } = useParams()
  const key = mode === 'invite' ? token : slug
  const { me } = useSession()
  const loc = useLocation()
  const nav = useNavigate()
  const { data, error, loading } = useApi<Preview>(mode === 'invite' ? `/join/${key}` : `/connect/${key}`)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const next = encodeURIComponent(loc.pathname)

  async function connect() {
    if (busy) return
    setBusy(true); setErr('')
    try {
      const r = await post<{ status?: string }>(mode === 'invite' ? `/join/${key}` : `/connect/${key}`)
      nav('/slip/connections', { replace: true, state: { connected: data?.business.name, pending: r.status === 'pending' } })
    } catch (x) { setErr(errText(x)) } finally { setBusy(false) }
  }

  /* signed in and the link is good: connect right away, no extra tap */
  const tried = useRef(false)
  useEffect(() => { if (me?.user && data && !tried.current) { tried.current = true; void connect() } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.user, data])

  if (loading) return <AuthLayout title="One moment"><div aria-busy="true" style={{ height: 120 }} /></AuthLayout>
  if (error || !data) return <AuthLayout title="This link does not work" lead={error || 'It may have expired.'} foot={<Link to="/">Go to Shakeslip</Link>}><p className="hint">Ask the business to send you a fresh invite.</p></AuthLayout>

  return (
    <AuthLayout title={mode === 'invite' ? `${data.business.name} invited you` : `Connect with ${data.business.name}`} lead={mode === 'invite' ? 'Connect once and every invoice from them reaches you here, with automatic updates by email.' : 'They will approve your request, then you will see their invoices here.'}>
      <div className="biz-card"><b>{data.business.name}</b>{data.business.city && <span>{data.business.city}</span>}{data.emailHint && <span>Invite sent to {data.emailHint}</span>}</div>
      {me?.user ? (
        <>
          <p className="hint">You are signed in as {me.user.email}.</p>
          {err && <p className="au-err" role="alert">{err}</p>}
          <Button variant="primary" block onClick={connect} disabled={busy}>{busy ? `Connecting you to ${data.business.name}` : mode === 'invite' ? 'Accept and connect' : 'Connect'}</Button>
        </>
      ) : (
        <div className="au-form">
          <Link to={`/signup?next=${next}`}><Button variant="primary" block>Create a free account</Button></Link>
          <Link to={`/login?next=${next}`}><Button block>I already have an account</Button></Link>
          {data.emailHint && <p className="hint">Use the email this invite was sent to ({data.emailHint}).</p>}
        </div>
      )}
    </AuthLayout>
  )
}
