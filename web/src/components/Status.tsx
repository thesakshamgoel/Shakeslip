import type { Status } from '../lib/types'

const MAP: Record<Status, { label: string; tone: string }> = {
  draft: { label: 'Draft', tone: 'neutral' }, sent: { label: 'Sent', tone: 'info' }, viewed: { label: 'Viewed', tone: 'info' },
  partial: { label: 'Part paid', tone: 'warn' }, paid: { label: 'Paid', tone: 'ok' }, overdue: { label: 'Overdue', tone: 'bad' },
  void: { label: 'Void', tone: 'neutral' },
}

export function StatusBadge({ status }: { status: Status }) {
  const m = MAP[status]
  return <span className={`badge badge-${m.tone}`}><span className="badge-dot" aria-hidden />{m.label}</span>
}
