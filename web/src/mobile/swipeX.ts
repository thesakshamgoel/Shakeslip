import { motionValue, type MotionValue } from 'motion/react'

/* The current screen's horizontal position. The swipe engine writes to it while a finger is down; when the route changes, the
   screen being left keeps this value and slides out from exactly where it is, while the next one slides in beside it. */
let cur: MotionValue<number> | null = null
export const newPageX = () => motionValue(0)
export const bindSwipeX = (mv: MotionValue<number>) => { cur = mv }
export const swipeX = { set: (v: number) => cur?.set(v), get: () => cur?.get() ?? 0, mv: () => cur }
