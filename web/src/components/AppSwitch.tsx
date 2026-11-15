import { motion } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SlipIcon, StudioIcon } from '../brand/icons'
import { navBlocked } from '../lib/navguard'
import './appswitch.css'

type App = 'studio' | 'slip'
const APPS: { k: App; label: string; Icon: typeof StudioIcon }[] = [{ k: 'studio', label: 'Studio', Icon: StudioIcon }, { k: 'slip', label: 'Slip', Icon: SlipIcon }]

/* Studio | Slip at the top. Tapping the other side slides the highlight across and turns its logo like the loader,
   then the other app opens. otherTo is where the other side leads (Studio setup if there is no business yet). */
export function AppSwitch({ app, otherTo, id }: { app: App; otherTo: string; id: string }) {
  const nav = useNavigate()
  const [on, setOn] = useState<App>(app)
  function go(k: App) {
    if (k === app || on !== app || navBlocked(otherTo)) return
    setOn(k)
    try { sessionStorage.setItem('ss-switch', '1') } catch { /* storage may be off */ }
    setTimeout(() => nav(otherTo), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240)
  }
  return (
    <div className="appsw" role="tablist" aria-label="Switch between Studio and Slip">
      {APPS.map(({ k, label, Icon }) => (
        <button key={k} type="button" role="tab" aria-selected={on === k} className="appsw-b tap" onClick={() => go(k)} title={k === app ? `You are in ${label}` : `Open ${label}`}>
          {on === k && <motion.span layoutId={`appsw-${id}`} className="appsw-pill" transition={{ type: 'spring', stiffness: 520, damping: 36 }} />}
          <Icon size={22} spinning={on === k && on !== app} /><span>{label}</span>
        </button>
      ))}
    </div>
  )
}
