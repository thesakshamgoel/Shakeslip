import { ArrowLeftRight, LogOut, Moon, Sun } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../lib/session'
import { useTheme } from '../lib/theme'
import { tick } from '../mobile/basics'
import type { NavItem } from './AppShell'
import './page.css'

/* Phone-only menu: everything that does not fit in the bottom bar. */
export default function More({ items, switchTo, switchLabel }: { items: NavItem[]; switchTo: string; switchLabel: string }) {
  const { me, logout } = useSession()
  const nav = useNavigate()
  const { theme, toggle } = useTheme()
  return (
    <>
      <div className="ph"><div><h1>More</h1><p>{me?.user?.email}</p></div></div>
      <div className="rows">
        {items.map((n) => <Link key={n.to} to={n.to} className="row tap" style={{ gridTemplateColumns: '24px 1fr' }}><n.icon size={20} aria-hidden /><b>{n.label}</b></Link>)}
        <Link to={switchTo} className="row tap" style={{ gridTemplateColumns: '24px 1fr' }}><ArrowLeftRight size={20} aria-hidden /><b>{switchLabel}</b></Link>
        <button className="row tap" style={{ gridTemplateColumns: '24px 1fr', textAlign: 'left' }} onClick={() => { tick(); toggle() }}>{theme === 'dark' ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}<b>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</b></button>
        <button className="row tap" style={{ gridTemplateColumns: '24px 1fr', textAlign: 'left' }} onClick={async () => { await logout(); nav('/', { replace: true }) }}><LogOut size={20} aria-hidden /><b>Sign out</b></button>
      </div>
    </>
  )
}
