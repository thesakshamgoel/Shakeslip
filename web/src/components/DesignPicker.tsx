import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { spring } from '../lib/motion'
import { invoiceThemes, LAYOUTS } from '../themes/invoice'
import './designpicker.css'

type Layout = (typeof LAYOUTS)[number]['id']

/* Six layouts and sixteen colour circles. Any layout works with any colours. */
export function DesignPicker({ layout, theme, onLayout, onTheme, id }: { layout: string; theme: string; onLayout: (v: Layout) => void; onTheme: (v: string) => void; id: string }) {
  const cur = invoiceThemes.find((t) => t.id === theme)
  return (
    <div className="dsg">
      <div className="lays" role="radiogroup" aria-label="Layout">
        {LAYOUTS.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={layout === l.id} className={`lay tap lay-${l.id}-p`} onClick={() => onLayout(l.id)}>
            <span className="lay-mini" aria-hidden><i /><i /><i /><i /></span><b>{l.name}</b><small>{l.blurb}</small>
          </button>
        ))}
      </div>
      <div className="dsg-col">
        <div className="dots" role="radiogroup" aria-label="Colours">
          {invoiceThemes.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={theme === t.id} aria-label={t.name} title={t.name} className="dot-c tap" onClick={() => onTheme(t.id)}>
              <span className="dot-fill" style={{ background: `linear-gradient(135deg, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%)` }} />
              {theme === t.id && <motion.span layoutId={`dot-ring-${id}`} className="dot-ring" transition={spring}><Check size={14} aria-hidden /></motion.span>}
            </button>
          ))}
        </div>
        <p className="dsg-name"><b>{cur?.name}</b><span>{cur?.blurb}</span></p>
      </div>
    </div>
  )
}
