import { useNavigate } from 'react-router-dom'
import { Button } from './Button'
import { errText, post } from '../lib/api'
import { useSession } from '../lib/session'
import { useToast } from '../lib/toast'

export function DeleteAccount() {
  const { logout } = useSession()
  const nav = useNavigate()
  const toast = useToast()
  async function go() {
    if (!window.confirm('Delete your account? You will be signed out everywhere and your login stops working. This cannot be undone.')) return
    try { await post('/account/me/delete'); await logout(); nav('/', { replace: true }) } catch (e) { toast.bad(errText(e)) }
  }
  return (
    <section className="ed-sec">
      <h2>Delete my account</h2>
      <p className="hint">This signs you out everywhere and stops your login from working. Businesses keep the invoices they already sent you, as they are their records.</p>
      <Button onClick={go}>Delete my account</Button>
    </section>
  )
}
