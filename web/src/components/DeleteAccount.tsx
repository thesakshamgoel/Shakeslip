import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './Button'
import { ConfirmAction } from './ConfirmAction'
import { post } from '../lib/api'
import { useSession } from '../lib/session'
export function DeleteAccount() {
  const { logout } = useSession(), nav = useNavigate()
  const [open, setOpen] = useState(false)
  return <section className="danger-zone"><div><h2>Delete account</h2><p className="hint">Permanently disable your login and sign out on every device. Businesses retain their invoice records.</p></div>
    <Button type="button" variant="danger" onClick={() => setOpen(true)}>Delete account</Button>
    <ConfirmAction open={open} onClose={() => setOpen(false)} title="Delete your account?" description="This cannot be undone. You will lose access to Studio and Slip. Businesses keep invoices already sent to you as their records." typed="DELETE" action="Delete account permanently" onConfirm={async () => { await post('/account/me/delete', { confirmation: 'DELETE' }); await logout(); nav('/', { replace: true }) }} />
  </section>
}
