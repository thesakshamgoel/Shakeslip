import { useToast } from '../lib/toast'
import './social.css'

/* Sign-in providers. Wired to one place so Firebase Auth (or another provider) can be connected later.
   Until then they explain themselves instead of failing. */
const PROVIDERS = [
  { id: 'google', label: 'Continue with Google', icon: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"/></svg> },
  { id: 'apple', label: 'Continue with Apple', icon: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="currentColor"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.5 1.3 0 1.7-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.2-1.2 3-2.4a10 10 0 0 0 1.4-2.8 4.4 4.4 0 0 1-2.3-4.2ZM13.8 5c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3-1.5Z"/></svg> },
]

export function SocialButtons() {
  const toast = useToast()
  return (
    <div className="soc">
      {PROVIDERS.map((p) => (
        <button key={p.id} type="button" className="soc-b tap" onClick={() => toast.ok(`${p.label.replace('Continue with ', '')} sign-in is coming soon. Use email for now.`)}>{p.icon}<span>{p.label}</span></button>
      ))}
      <div className="soc-or" aria-hidden><span>or with email</span></div>
    </div>
  )
}
