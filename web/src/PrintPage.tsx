import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { InvoiceDocument } from './components/InvoiceDocument'
import { docOf } from './lib/preview'
import type { InvoiceView } from './lib/types'
import './print.css'

declare global { interface Window { __printReady?: boolean } }

/* What the PDF renderer sees: only the invoice pages, at true A4, nothing else. */
export default function PrintPage() {
  const { id } = useParams()
  const [q] = useSearchParams()
  const [inv, setInv] = useState<InvoiceView | null>(null)
  useEffect(() => {
    document.documentElement.dataset.print = '1'
    fetch(`/api/print/${id}?t=${encodeURIComponent(q.get('t') ?? '')}`).then((r) => (r.ok ? r.json() : null)).then(setInv).catch(() => setInv(null))
  }, [id, q])
  useEffect(() => {
    if (!inv) return
    const imgs = [...document.images].map((i) => (i.complete ? Promise.resolve() : new Promise((r) => { i.onload = i.onerror = r })))
    void Promise.all([document.fonts.ready, ...imgs]).then(() => requestAnimationFrame(() => { window.__printReady = true }))
  }, [inv])
  if (!inv) return null
  return <div className="print-doc"><InvoiceDocument d={docOf(inv)} /></div>
}
