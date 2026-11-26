import { Bell, FileText, FilePlus2, Inbox as InboxIcon, LayoutDashboard, Layers, Link2, Mail, Settings as Cog, UserRound, Users } from 'lucide-react'
import { Link, Route, Routes } from 'react-router-dom'
import { Forgot, Reset } from './auth/Recovery'
import { RequireAuth, RequireStudio } from './auth/Guard'
import Join from './auth/Join'
import { Cookies, Licence, Privacy, Terms } from './auth/Legal'
import { Faq } from './auth/Faq'
import { CookieNotice } from './components/CookieNotice'
import Login from './auth/Login'
import Signup from './auth/Signup'
import { AppShell, type NavItem } from './components/AppShell'
import { Button } from './components/Button'
import Mailbox from './components/Mailbox'
import More from './components/More'
import Notifications from './components/Notifications'
import Home from './Home'
import Maintenance from './Maintenance'
import PrintPage from './PrintPage'
import Landing from './landing/Landing'
import SlipConnections from './slip/Connections'
import SlipDetail from './slip/Detail'
import SlipDetails from './slip/Details'
import SlipInbox from './slip/Inbox'
import Clients from './studio/Clients'
import Dashboard from './studio/Dashboard'
import Editor from './studio/Editor'
import InvoiceDetail from './studio/InvoiceDetail'
import Invoices from './studio/Invoices'
import Settings from './studio/Settings'
import Setup from './studio/Setup'
import TypeBuilder from './studio/TypeBuilder'
import Types from './studio/Types'
import { useSession } from './lib/session'

const mail: NavItem[] = import.meta.env.DEV ? [{ to: '/mailbox', label: 'Test mailbox', icon: Mail }] : []
const STUDIO: NavItem[] = [
  { to: '/studio', label: 'Home', icon: LayoutDashboard, end: true }, { to: '/studio/invoices', label: 'Invoices', icon: FileText },
  { to: '/studio/new', label: 'Create', icon: FilePlus2, primary: true }, { to: '/studio/clients', label: 'Clients', icon: Users },
]
const STUDIO_MORE: NavItem[] = [
  { to: '/studio/types', label: 'Invoice types', icon: Layers }, { to: '/studio/updates', label: 'Updates', icon: Bell, badge: true },
  { to: '/studio/settings', label: 'Settings', icon: Cog }, ...mail.map((m) => ({ ...m, to: '/studio/mailbox' })),
]
const SLIP: NavItem[] = [
  { to: '/slip', label: 'Inbox', icon: InboxIcon, end: true }, { to: '/slip/connections', label: 'Connections', icon: Link2 },
  { to: '/slip/updates', label: 'Updates', icon: Bell, badge: true }, { to: '/slip/details', label: 'My details', icon: UserRound },
]
const SLIP_MORE: NavItem[] = mail.map((m) => ({ ...m, to: '/slip/mailbox' }))

function NotFound() {
  return <main className="land"><div className="land-in"><h1 className="land-h">Page not found</h1><p className="land-p">That page does not exist or has moved.</p><Link to="/home"><Button variant="primary">Go home</Button></Link></div></main>
}

export default function App() {
  const { me } = useSession()
  const hasBiz = !!me?.business
  const toSlip = { switchTo: '/slip', switchLabel: 'Open Slip (my inbox)' }
  const toStudio = hasBiz ? { switchTo: '/studio', switchLabel: 'Open Studio' } : { switchTo: '/studio/setup', switchLabel: 'Set up Studio for my business' }
  return (
    <>
    <CookieNotice />
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot" element={<Forgot />} />
      <Route path="/reset/:token" element={<Reset />} />
      <Route path="/faq" element={<Faq />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/cookies" element={<Cookies />} />
      <Route path="/licence" element={<Licence />} />
      <Route path="/join/:token" element={<Join mode="invite" />} />
      <Route path="/c/:slug" element={<Join mode="code" />} />
      <Route element={<RequireAuth />}>
        <Route path="/home" element={<Home />} />
        <Route path="/studio/setup" element={<Setup />} />
        <Route element={<RequireStudio />}>
          <Route path="/studio" element={<AppShell app="studio" nav={STUDIO} more={STUDIO_MORE} {...toSlip} />}>
            <Route index element={<Dashboard />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="invoices/:id/edit" element={<Editor />} />
            <Route path="new" element={<Editor />} />
            <Route path="clients" element={<Clients />} />
            <Route path="types" element={<Types />} />
            <Route path="types/new" element={<TypeBuilder />} />
            <Route path="types/:id" element={<TypeBuilder />} />
            <Route path="updates" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
            <Route path="mailbox" element={<Mailbox />} />
            <Route path="more" element={<More items={STUDIO_MORE} {...toSlip} />} />
          </Route>
        </Route>
        <Route path="/slip" element={<AppShell app="slip" nav={SLIP} more={SLIP_MORE} {...toStudio} />}>
          <Route index element={<SlipInbox />} />
          <Route path="invoices/:id" element={<SlipDetail />} />
          <Route path="connections" element={<SlipConnections />} />
          <Route path="updates" element={<Notifications />} />
          <Route path="details" element={<SlipDetails />} />
          <Route path="mailbox" element={<Mailbox />} />
          <Route path="more" element={<More items={SLIP_MORE} {...toStudio} />} />
        </Route>
      </Route>
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="/print/:id" element={<PrintPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  )
}
