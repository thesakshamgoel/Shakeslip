import { useEffect, useRef, useState } from 'react'

/* Numbers roll to their new value with an ease-out curve. Instant when reduced motion is on. */
export function useCountUp(target: number, ms = 900): number {
  const [v, setV] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); from.current = target; return }
    const start = performance.now(), a = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms), e = 1 - Math.pow(1 - k, 4)
      setV(Math.round(a + (target - a) * e))
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}
