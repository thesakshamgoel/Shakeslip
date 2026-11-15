import { ArrowLeftRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AccountHeader, AccountRows } from './Account'
import type { NavItem } from './AppShell'
import './page.css'

/* Phone-only menu: everything that does not fit in the bottom bar, then the account: switch, add, theme, sign out. */
export default function More({ items, switchTo, switchLabel }: { items: NavItem[]; switchTo: string; switchLabel: string }) {
  return (
    <>
      <div className="ph"><div><h1>More</h1></div></div>
      <AccountHeader />
      <div className="rows">
        {items.map((n) => <Link key={n.to} to={n.to} className="row tap" style={{ gridTemplateColumns: '24px 1fr' }}><n.icon size={20} aria-hidden /><b>{n.label}</b></Link>)}
        <Link to={switchTo} className="row tap" style={{ gridTemplateColumns: '24px 1fr' }}><ArrowLeftRight size={20} aria-hidden /><b>{switchLabel}</b></Link>
      </div>
      <h2 className="acc-h">Accounts on this device</h2>
      <AccountRows />
    </>
  )
}
