import { AnimatePresence, motion } from 'motion/react'
import { Cookie } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from './Button'
import './cookie.css'

const KEY = 'ss-cookie-ok'
/* An honest notice, not a consent wall: we only use one essential cookie, so there is nothing to accept or reject. */
export function CookieNotice() {
  const loc = useLocation()
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem(KEY) === '1' } catch { return true } })
  if (loc.pathname.startsWith('/print/')) return null
  const ok = () => { try { localStorage.setItem(KEY, '1') } catch { /* storage may be off */ } setSeen(true) }
  return (
    <AnimatePresence>
      {!seen && (
        <motion.aside className="ck" role="region" aria-label="Cookie notice" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 320, damping: 30, delay: 1.2 }}>
          <Cookie size={20} aria-hidden />
          <p>We use one essential cookie to keep you signed in. No ads, no tracking. <Link to="/cookies">Cookie policy</Link></p>
          <Button variant="primary" onClick={ok}>Got it</Button>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
