import { motion } from 'motion/react'
import { Check, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { press, spring } from '../lib/motion'

/* Toggle chip. The check mark grows in when it turns on. */
export function Chip({ on, onClick, children, icon = true }: { on: boolean; onClick: () => void; children: ReactNode; icon?: boolean }) {
  return (
    <motion.button type="button" className="chip2" aria-pressed={on} onClick={onClick} whileTap={press} transition={spring} layout="position">
      {icon && <span className="chip2-ic">{on ? <Check size={13} strokeWidth={3} /> : <Plus size={13} strokeWidth={2.5} />}</span>}
      <span>{children}</span>
    </motion.button>
  )
}
