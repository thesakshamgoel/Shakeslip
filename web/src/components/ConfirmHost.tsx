import { useEffect, useState } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'

/* One place for every "are you sure?": askConfirm() opens the app's own red confirmation dialog (never the browser box)
   and resolves true only when the person presses the red button. */
type Ask = { title: string; description: string; action: string; resolve: (ok: boolean) => void }
let push: ((a: Ask) => void) | null = null

export function askConfirm(o: { title: string; description: string; action: string }): Promise<boolean> {
  return new Promise((resolve) => { if (push) push({ ...o, resolve }); else resolve(false) })
}

export function ConfirmHost() {
  const [ask, setAsk] = useState<Ask | null>(null)
  useEffect(() => { push = setAsk; return () => { push = null } }, [])
  const done = (ok: boolean) => { ask?.resolve(ok); setAsk(null) }
  return (
    <Dialog open={!!ask} onClose={() => done(false)} title={ask?.title ?? ''}>
      <p>{ask?.description}</p>
      <div className="confirm-actions">
        <Button type="button" onClick={() => done(false)}>Cancel</Button>
        <Button type="button" variant="danger" onClick={() => done(true)}>{ask?.action}</Button>
      </div>
    </Dialog>
  )
}
