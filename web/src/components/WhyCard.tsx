import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Info, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { springSoft } from '../lib/motion'
import { IconButton } from './Button'
import './why.css'

/* The reason an option is greyed out. Greyed options stay tappable and open this card instead of doing nothing. */
export function WhyCard({ open, title, text, to, action, onClose, children }: { open: boolean; title: string; text: string; to?: string; action?: string; onClose: () => void; children?: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div className="why" role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }} transition={springSoft}>
          <Info size={18} aria-hidden />
          <div><b>{title}</b><p>{text}</p>{to && <Link to={to} className="au-link">{action ?? 'Open settings'}</Link>}{children}</div>
          <IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
