import { AnimatePresence, motion } from 'motion/react'
import { createContext, useContext } from 'react'
import { greeting } from '../lib/welcome'
import './welcome.css'

const spring = { type: 'spring', stiffness: 150, damping: 20, mass: 1 } as const

/* True while the big greeting is on screen. The page heading waits, so the greeting holds in the middle first. */
export const WelcomeCtx = createContext(false)

/* The page heading. On a welcome it is the same element as the big centred greeting, so it glides into place. */
export function GreetHeading({ name }: { name: string }) {
  const waiting = useContext(WelcomeCtx)
  if (waiting) return <h1 className="greet-h" style={{ visibility: 'hidden' }}>{greeting()}, <span className="greet-name">{name}</span></h1>
  return <motion.h1 layoutId="greet" className="greet-h" transition={spring}>{greeting()}, <span className="greet-name">{name}</span></motion.h1>
}

/* Big greeting in the middle of a clear screen. When it ends, the heading slides up to its place and the app comes in. */
export function WelcomeOverlay({ name, open }: { name: string; open: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="welcome" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.15 } }} aria-hidden>
          <motion.h1 layoutId="greet" className="greet-big" transition={spring}>{greeting()}, <span className="greet-name">{name}</span></motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
