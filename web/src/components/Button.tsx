import { motion } from 'motion/react'
import type { ComponentProps } from 'react'
import { press, snappy } from '../lib/motion'
import './ui.css'

type Props = ComponentProps<typeof motion.button> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; block?: boolean }

export function Button({ variant = 'secondary', block, className = '', children, ...rest }: Props) {
  return (
    <motion.button
      whileTap={press}
      type="button"
      transition={snappy}
      className={`btn btn-${variant} ${block ? 'btn-block' : ''} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export function IconButton({ label, className = '', children, ...rest }: ComponentProps<typeof motion.button> & { label: string }) {
  return (
    <motion.button whileTap={press}
      type="button" transition={snappy} aria-label={label} title={label} className={`icon-btn ${className}`} {...rest}>
      {children}
    </motion.button>
  )
}
