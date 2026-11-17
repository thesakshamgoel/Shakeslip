import type { ComponentProps } from 'react'
import { capFor, LIMITS } from '../lib/limits'

type Props = { label: string; hint?: string } & ComponentProps<'input'>

/* Every text box has a limit. When you get close, the count shows, so you know why typing stops. */
export function Field({ label, hint, ...rest }: Props) {
  const cap = rest.maxLength ?? capFor({ type: rest.type, name: rest.name, label, inputMode: rest.inputMode })
  const len = typeof rest.value === 'string' ? rest.value.length : 0
  return (
    <label className={`field ${rest.type === 'number' || rest.inputMode === 'numeric' ? 'field-short' : /address|description|name|company|opening|banner|salutation/i.test(`${rest.name ?? ''} ${label}`) ? 'field-long' : ''}`}>
      <span>{label}</span>
      <input className="input" {...rest} maxLength={cap} />
      {len >= cap * 0.8 ? <small className="cap num" aria-live="polite">{len} of {cap} characters</small> : hint && <small style={{ color: 'var(--text-3)', fontSize: 'var(--t-xs)' }}>{hint}</small>}
    </label>
  )
}

export function TextArea({ label, ...rest }: { label: string } & ComponentProps<'textarea'>) {
  const cap = rest.maxLength ?? LIMITS.note
  const len = typeof rest.value === 'string' ? rest.value.length : 0
  return (
    <label className="field field-long">
      <span>{label}</span>
      <textarea className="input" {...rest} maxLength={cap} />
      {len >= cap * 0.8 && <small className="cap num" aria-live="polite">{len} of {cap} characters</small>}
    </label>
  )
}
