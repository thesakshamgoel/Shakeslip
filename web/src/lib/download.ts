import { errText } from './api'

/* Downloads the exact PDF the server renders from your design. */
export async function downloadPdf(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(`/api${path}`, { credentials: 'same-origin' })
  if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.message ?? errText(null)) }
  const blob = await res.blob()
  const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? fallbackName
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
