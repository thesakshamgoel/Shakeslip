/* Motion profile: Apple-like. Springs for anything that moves, short ease-outs for fades.
   Everything animates transform and opacity only. Interruptible by default. */
import type { Transition } from 'motion/react'

export const spring: Transition = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }
export const springSoft: Transition = { type: 'spring', stiffness: 260, damping: 30, mass: 1 }
export const fade: Transition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
export const press = { scale: 0.97 }

/* Pages settle in like iOS: a short rise with a touch of scale, interruptible. */
export const pageVariants = {
  initial: { opacity: 0, y: 14, scale: 0.992 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 32, mass: 0.9 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
} as const

export const reveal = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { type: 'spring', stiffness: 160, damping: 26 } } as const

export const listItem = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { ...springSoft, delay: Math.min(i, 8) * 0.03 } },
})
