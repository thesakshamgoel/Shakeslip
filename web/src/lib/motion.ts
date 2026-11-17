/* Motion profile: Apple-like. Springs for anything that moves, short ease-outs for fades.
   Everything animates transform and opacity only. Interruptible by default. */
import type { Transition } from 'motion/react'

/* Apple-style motion system. Like SwiftUI, every spring is described by how long it looks and how much it bounces,
   and the whole app uses only these few, so everything moves with one feel.
   smooth: large surfaces (sheets, pages, panels). snappy: small controls (menus, toggles, pills, chips).
   bouncy: rare moments of success only. quick: press and release feedback. All interruptible; transform and opacity only.
   The same curves exist in CSS as --spring-* (see tokens.css) so CSS transitions match exactly. */
export const smooth: Transition = { type: 'spring', visualDuration: 0.42, bounce: 0 }
/* dismissal: reaches fully off-screen exactly when it ends (a spring's long tail would hold the sheet open or cut it short) */
export const smoothOut: Transition = { duration: 0.36, ease: [0.3, 0, 0.1, 1] }
export const snappy: Transition = { type: 'spring', visualDuration: 0.28, bounce: 0.12 }
/* glide: one long, calm move across the screen (the greeting rising into the heading) */
export const glide: Transition = { type: 'spring', visualDuration: 0.62, bounce: 0 }
export const bouncy: Transition = { type: 'spring', visualDuration: 0.4, bounce: 0.28 }
export const quick: Transition = { type: 'spring', visualDuration: 0.16, bounce: 0 }
export const fadeOut: Transition = { duration: 0.12, ease: [0.4, 0, 1, 1] }

/* older names, kept so every existing use moves with the system */
export const spring: Transition = snappy
export const springSoft: Transition = smooth
export const fade: Transition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
export const press = { scale: 0.96 }

/* Pages settle in like iOS: a short, interruptible rise. */
export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: smooth },
  exit: { opacity: 0, transition: { duration: 0.12 } },
} as const

export const reveal = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: smooth } as const

export const listItem = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { ...springSoft, delay: Math.min(i, 4) * 0.018 } },
})
