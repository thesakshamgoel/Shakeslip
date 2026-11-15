import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

/* QR rendered locally in the browser. Nothing is sent to a third party. */
export function QR({ value, size = 168, fluid }: { value: string; size?: number; fluid?: boolean }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let live = true
    QRCode.toDataURL(value, { width: size * 2, margin: 1, color: { dark: '#0b0b0d', light: '#ffffff' } }).then((u) => { if (live) setSrc(u) }).catch(() => {})
    return () => { live = false }
  }, [value, size])
  const style = fluid ? { width: '100%', height: 'auto', aspectRatio: '1 / 1', background: '#fff' } : { borderRadius: 12, background: '#fff', aspectRatio: '1 / 1' }
  return src ? <img src={src} width={size} height={size} alt="QR code. Scan it with a phone camera." style={style} /> : <div style={{ width: fluid ? '100%' : size, aspectRatio: '1 / 1', borderRadius: fluid ? 0 : 12, background: 'var(--surface-2)' }} aria-hidden />
}
