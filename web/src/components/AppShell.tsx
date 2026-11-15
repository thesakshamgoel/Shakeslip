import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { ChevronLeft, Ellipsis, X, Search, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { SlipIcon, StudioIcon } from '../brand/icons'
import { useBusy } from '../lib/busy'
import { spring } from '../lib/motion'
import { CommandPalette } from './CommandPalette'
import { useSession } from '../lib/session'
import { AccountMenu } from './Account'
import { takeWelcome, touchSeen } from '../lib/welcome'
import { depthOf, parentOf, tick, titleOf, usePhone } from '../mobile/basics'
import { PullToRefresh } from '../mobile/PullToRefresh'
import { SlideOutlet } from '../mobile/SlideOutlet'
import { SwipeClaimProvider, useSwipe, type Claim } from '../mobile/swipe'
import { navBlocked } from '../lib/navguard'
import { IconButton } from './Button'
import { Popups } from './Popups'
import { AppSwitch } from './AppSwitch'
import { WelcomeCtx, WelcomeOverlay } from './Welcome'
import './shell.css'

export type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; badge?: boolean; primary?: boolean }
/* switchLabel is used by the More page; the shell shows the Studio | Slip switch instead */
type Props = { app: 'studio' | 'slip'; nav: NavItem[]; more: NavItem[]; switchTo: string; switchLabel?: string }

export function AppShell({ app, nav, more, switchTo }: Props) {
  const { me, refresh } = useSession()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const Icon = app === 'studio' ? StudioIcon : SlipIcon
  const name = app === 'studio' ? 'Studio' : 'Slip'
  const unread = me?.unread ?? 0
  const busy = useBusy()
  const openPalette = () => window.dispatchEvent(new Event('open-palette'))
  const mac = /Mac|iPhone|iPad/.test(navigator.platform)
  /* the welcome greeting: once after signing in or a long break, held for a beat, then it slides into the page heading */
  const [welcome, setWelcome] = useState(() => takeWelcome())
  /* arriving from the other app: its logo turns like the loader for a moment while this one settles in */
  const [arrive, setArrive] = useState(() => { try { const v = sessionStorage.getItem('ss-switch') === '1'; sessionStorage.removeItem('ss-switch'); return v } catch { return false } })
  useEffect(() => { if (!arrive) return; const t = setTimeout(() => setArrive(false), 650); return () => clearTimeout(t) }, [arrive])
  useEffect(() => {
    if (!welcome) return
    const t = setTimeout(() => setWelcome(false), matchMedia('(prefers-reduced-motion: reduce)').matches ? 600 : 1700)
    return () => clearTimeout(t)
  }, [welcome])
  useEffect(() => {
    const id = setInterval(touchSeen, 60_000)
    addEventListener('pagehide', touchSeen)
    return () => { clearInterval(id); removeEventListener('pagehide', touchSeen) }
  }, [])
  useEffect(() => { void refresh() }, [pathname, refresh])
  /* remember where you were, so coming back opens the same place */
  useEffect(() => { try { if (!pathname.endsWith('/more')) localStorage.setItem(`ss-last-${app}`, pathname + location.search) } catch { /* storage may be off */ } }, [pathname, app])
  const all = [...nav, ...more]

  /* phone: where tabs are, how deep we are, swipes, the keyboard */
  const phone = usePhone()
  const tabs = [...nav.map((n) => n.to), `/${app}/more`]
  const depth = depthOf(pathname, tabs)
  const idx = tabs.indexOf(pathname)
  /* the invoice editor is a full-screen flow on a phone: close button instead of the tab bar */
  const flow = phone && (/\/invoices\/[^/]+\/edit$/.test(pathname) || (pathname === `/${app}/new` && /type=/.test(search)))
  const closeFlow = () => { tick(); if (navBlocked(`/${app}/invoices`)) return; navigate(`/${app}/invoices`) }
  const mainRef = useRef<HTMLElement>(null)
  const claim = useRef<Claim | null>(null)
  const goTab = (to: string) => { if (navBlocked(to)) return true; navigate(to); return true }
  const goBack = () => { if (depth === 0) return false; if (navBlocked(parentOf(pathname))) return true; if ((history.state as { idx?: number } | null)?.idx) navigate(-1); else navigate(parentOf(pathname), { replace: true }); return true }
  useSwipe(mainRef, claim, {
    tabLeft: () => depth === 0 && idx >= 0 && idx < tabs.length - 1 && goTab(tabs[idx + 1]),
    tabRight: () => depth === 0 && idx > 0 && goTab(tabs[idx - 1]),
    canTabLeft: () => depth === 0 && idx >= 0 && idx < tabs.length - 1,
    canTabRight: () => depth === 0 && idx > 0,
    canBack: () => depth > 0,
    back: goBack,
  }, phone)
  const [kb, setKb] = useState(false)
  useEffect(() => {
    const v = window.visualViewport
    if (!v) return
    const on = () => setKb(innerHeight - v.height > 140)
    v.addEventListener('resize', on)
    return () => v.removeEventListener('resize', on)
  }, [])

  return (
    <LayoutGroup id="welcome"><WelcomeCtx.Provider value={welcome}>
      <div className={`shell ${welcome ? 'shell-wait' : 'shell-in'} ${kb ? 'kb' : ''} ${flow ? 'flow' : ''}`} data-app={app} data-depth={depth}>
        <WelcomeOverlay name={me?.user?.name.split(' ')[0] ?? ''} open={welcome} />
        <AnimatePresence>
          {arrive && !welcome && (
            <motion.div className="switch-ov" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }} aria-hidden>
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="switch-ov-in">
                <Icon size={92} spinning /><b className="glow-text">{name}</b>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <Popups app={app} />
        <aside className="side">
          <Link to={`/${app}`} className="brand" aria-label={`Shakeslip ${name} home`}><Icon size={46} spinning={busy} /><span className="brand-word">Shakeslip</span><span className="brand-tag">{name}</span></Link>
          <AppSwitch app={app} otherTo={switchTo} id="side" />
          <button className="search tap" onClick={openPalette}><Search size={16} aria-hidden /><span>Search</span><kbd>{mac ? '⌘' : 'Ctrl'} K</kbd></button>
          <nav className="side-nav" aria-label="Main">
            {all.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={`side-link tap ${n.primary ? 'primary' : ''}`}>
                {({ isActive }) => (<>
                  {isActive && <motion.span layoutId={`${app}-side-pill`} className="side-pill" transition={spring} />}
                  <n.icon size={18} aria-hidden /><span>{n.label}</span>
                  {n.badge && unread > 0 && <span className="dot" aria-label={`${unread} new`}>{unread > 9 ? '9+' : unread}</span>}
                </>)}
              </NavLink>
            ))}
          </nav>
          <div className="side-foot">
            <AccountMenu />
          </div>
        </aside>

        <header className={`topbar ${depth > 0 || flow ? 'is-pushed' : ''}`}>
          {flow ? (
            <>
              <button type="button" className="bar-back tap" aria-label="Close" onClick={closeFlow}><X size={26} aria-hidden /></button>
              <h1 className="bar-title">{/edit$/.test(pathname) ? 'Edit draft' : 'New invoice'}</h1>
            </>
          ) : depth > 0 ? (
            <>
              <button type="button" className="bar-back tap" aria-label="Back" onClick={() => { tick(); goBack() }}><ChevronLeft size={28} aria-hidden /></button>
              <AnimatePresence mode="wait" initial={false}><motion.h1 key={titleOf(pathname)} className="bar-title" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>{titleOf(pathname)}</motion.h1></AnimatePresence>
            </>
          ) : (
            <>
              <Link to={`/${app}`} className="brand" aria-label={`Shakeslip ${name} home`}><Icon size={32} spinning={busy} /><span className="brand-word">Shakeslip</span><span className="brand-tag">{name}</span></Link>
              <AppSwitch app={app} otherTo={switchTo} id="top" />
            </>
          )}
          <div className="topbar-actions"><IconButton label="Search" onClick={openPalette}><Search size={20} /></IconButton></div>
        </header>
        {phone && <PullToRefresh />}

        <main className="main" ref={mainRef}>
          <SwipeClaimProvider value={claim}><SlideOutlet phone={phone} tabs={tabs} /></SwipeClaimProvider>
        </main>

        <CommandPalette app={app} actions={all} />

        <nav className="tabs" aria-label="Main">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => tick(6)} className={`tab tap ${n.primary ? 'primary' : ''}`}>
              {({ isActive }) => (<>
                {isActive && <motion.span layoutId={`${app}-tab-pill`} className="tab-pill" transition={spring} />}
                <n.icon size={20} aria-hidden /><span>{n.label}</span>
                {n.badge && unread > 0 && <span className="dot tab-dot" aria-label={`${unread} new`}>{unread > 9 ? '9+' : unread}</span>}
              </>)}
            </NavLink>
          ))}
          <NavLink to={`/${app}/more`} onClick={() => tick(6)} className="tab tap">
            {({ isActive }) => (<>{isActive && <motion.span layoutId={`${app}-tab-pill`} className="tab-pill" transition={spring} />}<Ellipsis size={20} aria-hidden /><span>More</span></>)}
          </NavLink>
        </nav>
      </div>
    </WelcomeCtx.Provider></LayoutGroup>
  )
}
