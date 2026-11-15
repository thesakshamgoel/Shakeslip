/* Annexure starting points. {tokens} fill in from the invoice like the terms do. */
export const ANNEX_TEMPLATES: { id: string; label: string; text: string }[] = [
  { id: 'timeline', label: 'Timeline', text: '# Timeline\n- Kick-off: on receipt of the advance\n- First draft: within 10 working days\n- Feedback: within 5 working days of each draft\n- Final delivery: by {due_date}' },
  { id: 'milestones', label: 'Milestones', text: '# Milestones and payments\n- Booking: {plan_advance} on signing\n- Delivery: {plan_balance} on final delivery\n- Total: {total}' },
  { id: 'deliverables', label: 'Deliverables list', text: '# Deliverables\n- Final files in the agreed formats\n- One round of revisions per deliverable\n- Delivery by link, available for 30 days' },
  { id: 'exclusions', label: 'Not included', text: '# Not included\n- Anything not listed in this invoice\n- Travel and stay outside {city}\n- Third-party licences, stock and music\n- Rush delivery' },
  { id: 'acceptance', label: 'Acceptance', text: '# Acceptance\n- Deliverables are accepted if no change is requested within 7 days of delivery.\n- Changes after acceptance are quoted as new work.' },
]
