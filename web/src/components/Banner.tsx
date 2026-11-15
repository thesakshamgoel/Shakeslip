import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import './banner.css'

/* Guidance at the top of a step: what is missing and how to fix it. Shakes when you try to move on. */
export function Banner({ tone = 'info', title, children, shake = 0 }: { tone?: 'info' | 'warn' | 'error'; title: string; children?: ReactNode; shake?: number }) {
  const Icon = tone === 'error' ? CircleAlert : tone === 'warn' ? TriangleAlert : Info
  return (
    <AnimatePresence>
      <motion.div key={shake} className={`bn bn-${tone}`} role={tone === 'error' ? 'alert' : 'status'}
        initial={shake ? { x: 0 } : { opacity: 0, y: -8 }} animate={shake ? { x: [0, -8, 7, -5, 3, 0] } : { opacity: 1, y: 0 }} transition={shake ? { duration: 0.42 } : { type: 'spring', stiffness: 400, damping: 30 }}>
        <Icon size={18} aria-hidden /><div><b>{title}</b>{children && <div className="bn-body">{children}</div>}</div>
      </motion.div>
    </AnimatePresence>
  )
}
