import { Chip } from './Chip'

export type Rules = { before: number[]; onDue: boolean; afterEvery: number | null }
const BEFORE = [1, 2, 3, 7]
const AFTER = [null, 1, 7, 30] as const
const every = (n: number) => (n === 1 ? 'every day' : n === 7 ? 'every week' : n === 30 ? 'every month' : `every ${n} days`)

/* One plain sentence for a schedule, e.g. "2 days before, on the due date, every 7 days after". */
export const rulesText = (r: Rules) => {
  const parts = [...[...r.before].sort((a, b) => b - a).map((n) => `${n} ${n === 1 ? 'day' : 'days'} before`), r.onDue && 'on the due date', r.afterEvery && `${every(r.afterEvery)} once it is late`].filter(Boolean)
  return parts.length ? parts.join(', ') : 'no reminders'
}

/* Pick when automatic reminders go out: before the due date, on it, and how often once it is late. */
export function ReminderRules({ value, onChange }: { value: Rules; onChange: (r: Rules) => void }) {
  const set = (p: Partial<Rules>) => onChange({ ...value, ...p })
  return (
    <div className="rr">
      <div className="rr-row"><small>Before it is due</small>
        <div className="chips2">{BEFORE.map((d) => <Chip key={d} on={value.before.includes(d)} onClick={() => set({ before: value.before.includes(d) ? value.before.filter((x) => x !== d) : [...value.before, d].sort((a, b) => a - b) })}>{d} {d === 1 ? 'day' : 'days'}</Chip>)}</div>
      </div>
      <div className="rr-row"><small>On the day</small>
        <div className="chips2"><Chip on={value.onDue} onClick={() => set({ onDue: !value.onDue })}>On the due date</Chip></div>
      </div>
      <div className="rr-row"><small>Once it is late</small>
        <div className="chips2">{AFTER.map((n) => <Chip key={String(n)} icon={false} on={value.afterEvery === n} onClick={() => set({ afterEvery: n })}>{n == null ? 'Stop' : n === 1 ? 'Daily' : n === 7 ? 'Weekly' : 'Monthly'}</Chip>)}</div>
      </div>
    </div>
  )
}
