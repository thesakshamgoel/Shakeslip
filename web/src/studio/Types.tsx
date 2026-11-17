import { Archive, Pencil, Plus } from 'lucide-react'
import { askConfirm } from '../components/ConfirmHost'
import { Link } from 'react-router-dom'
import { Button, IconButton } from '../components/Button'
import { del, errText } from '../lib/api'
import { useToast } from '../lib/toast'
import type { InvoiceType } from '../lib/types'
import { useApi } from '../lib/useApi'
import '../components/page.css'
import './types.css'

export default function Types() {
  const { data, reload } = useApi<InvoiceType[]>('/studio/types')
  const toast = useToast()
  async function archive(t: InvoiceType) {
    if (!(await askConfirm({ title: `Remove "${t.name}"?`, description: 'Invoices you already sent keep working. You will not be able to create new ones of this type.', action: 'Remove type' }))) return
    try { await del(`/studio/types/${t.id}`); toast.ok('Invoice type removed.'); await reload() } catch (e) { toast.bad(errText(e)) }
  }
  return (
    <>
      <div className="ph">
        <div><h1>Invoice types</h1><p>Design the documents your business sends. Each type has its own fields, tax and numbering.</p></div>
        <Link to="/studio/types/new"><Button variant="primary"><Plus size={18} aria-hidden />Design a type</Button></Link>
      </div>
      <div className="types-grid">
        {(data ?? []).map((t) => (
          <div className="trow" key={t.id}>
            <span className="row-main"><b>{t.name}</b><span>{t.title} · {t.prefix}/… · {t.taxMode === 'gst' ? `GST ${t.defaultGst}%` : 'No tax'} · {t.fields.length} extra field{t.fields.length === 1 ? '' : 's'}</span></span>
            <Link to={`/studio/new?type=${t.id}`}><Button>Use</Button></Link>
            <Link to={`/studio/types/${t.id}`} aria-label={`Edit ${t.name}`} className="icon-btn tap"><Pencil size={18} /></Link>
            <IconButton className="danger-text" label={`Remove ${t.name}`} onClick={() => archive(t)}><Archive size={18} /></IconButton>
          </div>
        ))}
      </div>
    </>
  )
}
