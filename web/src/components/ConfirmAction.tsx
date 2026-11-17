import { useState } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { Field, TextArea } from './Field'
import { useToast } from '../lib/toast'
import { errText } from '../lib/api'
export function ConfirmAction({ open, title, description, action, onClose, onConfirm, typed, reason }: { open: boolean; title: string; description: string; action: string; onClose: () => void; onConfirm: (reason: string) => Promise<unknown>; typed?: string; reason?: boolean }) {
  const [text, setText] = useState(''), [note, setNote] = useState(''), [busy, setBusy] = useState(false)
  const toast = useToast()
  const close = () => { if (!busy) { setText(''); setNote(''); onClose() } }
  return <Dialog open={open} onClose={close} title={title}><p>{description}</p>
    {typed && <Field label={`Type ${typed} to confirm`} value={text} autoComplete="off" onChange={(e) => setText(e.target.value)} />}
    {reason && <TextArea label="Reason (shared with the client)" value={note} rows={4} maxLength={500} onChange={(e) => setNote(e.target.value)} />}
    <div className="confirm-actions"><Button type="button" disabled={busy} onClick={close}>Cancel</Button><Button type="button" variant="danger" disabled={busy || (!!typed && text !== typed) || (!!reason && !note.trim())} onClick={async () => { if (busy) return; setBusy(true); try { await onConfirm(note.trim()); setText(''); setNote(''); onClose() } catch (e) { toast.bad(errText(e)) } finally { setBusy(false) } }}>{busy ? 'Please wait' : action}</Button></div>
  </Dialog>
}
