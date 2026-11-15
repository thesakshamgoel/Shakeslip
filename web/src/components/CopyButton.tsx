import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from './Button'

export function CopyButton({ text, label = 'Copy link' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <Button onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000) } catch { window.prompt('Copy this:', text) } }}>
      {done ? <><Check size={18} aria-hidden />Copied</> : <><Copy size={18} aria-hidden />{label}</>}
    </Button>
  )
}
