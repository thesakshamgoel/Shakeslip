import { motion } from 'motion/react'
import { Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listDrafts } from './editor/localDraft'
import { listItem } from '../lib/motion'
import type { InvoiceType } from '../lib/types'
import '../components/page.css'
import './types.css'

const describe = (t: InvoiceType) => [t.taxMode === 'gst' ? `GST ${t.defaultGst}%` : 'No tax', t.lineMode === 'qty_rate' ? `${t.qtyLabel} × ${t.rateLabel}` : 'Simple amounts', t.fields.length ? `${t.fields.length} extra field${t.fields.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')

/* Step one of creating an invoice: choose a type, or design your own. */
export default function TypePicker({ types, client }: { types: InvoiceType[]; client?: string | null }) {
  const [drafts] = useState(listDrafts)
  return (
    <>
      <div className="ph"><div><h1>What are you creating?</h1><p>Pick an invoice type. Each one has its own fields, tax and numbering.</p></div></div>
      {drafts.length > 0 && (
        <section className="resume" aria-label="Unfinished invoices">
          <h2>Pick up where you left off</h2>
          {drafts.map(({ key, s }) => {
            const t = types.find((x) => x.id === s.typeId)
            return t && <Link key={key} to={`/studio/new?type=${t.id}`} className="resume-i tap"><RotateCcw size={18} aria-hidden /><span><b>{t.name}{s.client ? `, ${s.client}` : ''}</b><small>Unsaved, last edited {new Date(s.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</small></span></Link>
          })}
        </section>
      )}
      <div className="tcards">
        {types.map((t, i) => (
          <motion.div key={t.id} {...listItem(i)}>
            <Link to={`/studio/new?type=${t.id}${client ? `&client=${client}` : ''}`} className="tcard tap"><b>{t.name}</b><span>{describe(t)}</span><small>Numbers look like {t.prefix}/2026-27/0001</small></Link>
          </motion.div>
        ))}
        <motion.div {...listItem(types.length)}>
          <Link to="/studio/types/new" className="tcard tcard-new tap"><Plus size={22} aria-hidden /><b>Design your own</b><span>Choose the fields, columns and tax that fit your business.</span></Link>
        </motion.div>
      </div>
    </>
  )
}
