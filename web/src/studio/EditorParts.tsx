import { DatePicker } from '../components/DatePicker'
import { Select } from '../components/Select'
import type { CustomField } from '../lib/types'

/* A custom field from an invoice type, drawn with our own controls. error marks it red and lets it shake. */
export function FieldInput({ f, value, onChange, error }: { f: CustomField; value: string; onChange: (v: string) => void; error?: boolean }) {
  const label = f.required ? f.label : `${f.label} (optional)`
  const msg = error ? `Fill in ${f.label.toLowerCase()} to continue.` : undefined
  if (f.kind === 'select') return <div className={error ? 'shake' : ''}><Select label={label} value={value} onChange={onChange} options={(f.options ?? []).map((o) => ({ value: o, label: o }))} error={msg} /></div>
  if (f.kind === 'date') return <div className={error ? 'shake' : ''}><DatePicker label={label} value={value} onChange={onChange} error={msg} /></div>
  return (
    <label className={`field ${error ? 'err shake' : ''}`}>
      <span>{label}</span>
      {f.kind === 'longtext'
        ? <textarea className="input" value={value} maxLength={500} onChange={(e) => onChange(e.target.value)} aria-invalid={error} />
        : <input className="input" inputMode={f.kind === 'number' ? 'decimal' : undefined} value={value} maxLength={500} onChange={(e) => onChange(e.target.value)} aria-invalid={error} />}
      {msg && <small className="field-err">{msg}</small>}
    </label>
  )
}
