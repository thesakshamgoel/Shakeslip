import { motion } from 'motion/react'
import type { ComponentProps } from 'react'
import { press, spring } from '../lib/motion'
import './ui.css'

type Props = ComponentProps<typeof motion.button> & { variant?: 'primary' | 'secondary' | 'ghost'; block?: boolean }

export function Button({ variant = 'secondary', block, className = '', children, ...rest }: Props) {
  return (
    <motion.button
      whileTap={press}
      transition={spring}
      className={`btn btn-${variant} ${block ? 'btn-block' : ''} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export function IconButton({ label, className = '', children, ...rest }: ComponentProps<typeof motion.button> & { label: string }) {
  return (
    <motion.button whileTap={press} transition={spring} aria-label={label} title={label} className={`icon-btn ${className}`} {...rest}>
      {children}
    </motion.button>
  )
}
