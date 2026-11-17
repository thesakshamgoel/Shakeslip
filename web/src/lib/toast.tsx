import { AnimatePresence, motion } from 'motion/react'
import { snappy } from './motion'
import { Check, CircleAlert } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import './toast.css'

type T = { id: number; text: string; tone: 'ok' | 'bad' }
const Ctx = createContext<{ ok: (t: string) => void; bad: (t: string) => void }>({ ok: () => {}, bad: () => {} })
export const useToast = () => useContext(Ctx)
let n = 0
const island = snappy

/* Messages arrive in an island at the top: it grows out of a pill, holds, then tucks back in. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [cur, setCur] = useState<T | null>(null)
  const push = useCallback((text: string, tone: T['tone']) => {
    const id = ++n
    setCur({ id, text, tone })
    setTimeout(() => setCur((c) => (c?.id === id ? null : c)), tone === 'bad' ? 5200 : 3200)
  }, [])
  const value = useMemo(() => ({ ok: (t: string) => push(t, 'ok'), bad: (t: string) => push(t, 'bad') }), [push])
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="island-wrap" aria-live="polite" role="status">
        <AnimatePresence mode="popLayout">
          {cur && (
            <motion.div key={cur.id} className={`island island-${cur.tone}`} layout
              initial={{ opacity: 0, scale: 0.6, y: -18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.7, y: -14 }} transition={island}>
              <span className="island-ic">{cur.tone === 'ok' ? <Check size={14} strokeWidth={3} /> : <CircleAlert size={15} />}</span>
              <span>{cur.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
