import { motion } from 'motion/react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { gstinValid } from '../../lib/gst'
import { money } from '../../lib/money'
import { listItem } from '../../lib/motion'
import type { Business, InvoiceType, Link as ClientLink } from '../../lib/types'
import { DesignPicker } from '../../components/DesignPicker'
import type { Draft } from './state'

type Check = { ok: boolean; text: string; fix?: { to: string; label: string }; blocking?: boolean }

/* A pre-flight check, so nothing goes out half-finished. */
export function reviewChecks(d: Draft, type: InvoiceType, link: ClientLink | undefined, from: Business, total: number): Check[] {
  const missing = type.fields.find((f) => f.required && !d.fields[f.id]?.trim())
  const zero = d.items.filter((i) => i.desc.trim() && Math.round(i.qty * i.rate) === 0).length
  return [
    { ok: !!link, text: link ? `Going to ${link.company || link.name}` : 'Choose a client', blocking: true },
    { ok: total > 0, text: total > 0 ? `Total ${money(total, d.extra.currency)}` : 'Add at least one line with an amount', blocking: true },
    { ok: !missing, text: missing ? `Fill in "${missing.label}"` : 'All required fields are filled in', blocking: true },
    { ok: !zero, text: zero ? `${zero} ${zero === 1 ? 'line has' : 'lines have'} no amount yet` : 'Every line has an amount' },
    { ok: !!link?.email, text: link?.email ? 'They get an email copy automatically' : 'No email for this client, they will only see it in Slip' },
    { ok: !link?.gstin || gstinValid(link.gstin), text: link?.gstin ? (gstinValid(link.gstin) ? 'Client GSTIN checks out' : 'Client GSTIN looks wrong') : 'No client GSTIN (fine for individuals)' },
    { ok: !!(from.upiId || from.accountNo) || !d.extra.showBank, text: !d.extra.showBank ? 'Payment details hidden on this invoice' : from.upiId ? 'UPI QR included, they can scan to pay' : from.accountNo ? 'Bank details included' : 'No payment details yet', fix: from.upiId || from.accountNo ? undefined : { to: '/studio/settings', label: 'Add UPI or bank' } },
    { ok: d.terms.length > 0 || !!d.extra.customTerms.trim(), text: d.terms.length || d.extra.customTerms.trim() ? 'Terms on their own page' : 'No terms (optional)' },
    { ok: d.extra.currency === 'INR' || d.gstPct === 0, text: d.extra.currency !== 'INR' && d.gstPct > 0 ? 'GST on a foreign-currency invoice: check if this is right' : `Currency: ${d.extra.currency}` },
  ]
}

export function ReviewStep({ d, set, checks }: { d: Draft; set: (p: Partial<Draft>) => void; checks: Check[] }) {
  return (
    <div className="st">
      <div className="st-block">
        <h3>Before you send</h3>
        <ul className="checks">
          {checks.map((c, i) => (
            <motion.li key={c.text} className={c.ok ? 'ok' : c.blocking ? 'bad' : 'warn'} {...listItem(i)}>
              {c.ok ? <CircleCheck size={18} aria-hidden /> : <CircleAlert size={18} aria-hidden />}
              <span>{c.text}</span>
              {c.fix && <Link to={c.fix.to} className="au-link">{c.fix.label}</Link>}
            </motion.li>
          ))}
        </ul>
      </div>
      <div className="st-block">
        <h3>Design</h3>
        <DesignPicker id="rv" layout={d.extra.layout ?? 'classic'} theme={d.theme} onLayout={(v) => set({ extra: { ...d.extra, layout: v } })} onTheme={(v) => set({ theme: v })} />
      </div>
    </div>
  )
}
