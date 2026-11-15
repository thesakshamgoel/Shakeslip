/* Dates are stored as UTC ISO strings and only formatted for display. */
const f = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
const ft = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
export const fmtDate = (iso: string) => f.format(new Date(iso))
export const fmtDateTime = (iso: string) => ft.format(new Date(iso))
export const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString()

/* <input type="date"> values in Indian time, so the picker and the document always agree. */
const ymd = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Kolkata' })
export const toDateInput = (iso: string) => ymd.format(new Date(iso))
export const fromDateInput = (v: string) => new Date(`${v}T09:00:00+05:30`).toISOString()
