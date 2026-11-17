import { Mail } from 'lucide-react'
import { WhatsAppIcon } from './WhatsAppIcon'
export function ConnectShare({ url, name }: { url: string; name: string }) {
  const body = `Hi, connect with ${name} on Shakeslip to receive and review your invoices: ${url}`
  return <div className="share" aria-label="Share connect link"><a className="btn tap" href={`https://wa.me/?text=${encodeURIComponent(body)}`} target="_blank" rel="noopener noreferrer"><WhatsAppIcon />WhatsApp</a><a className="btn tap" href={`mailto:?subject=${encodeURIComponent(`Connect with ${name} on Shakeslip`)}&body=${encodeURIComponent(body)}`}><Mail size={18} aria-hidden />Email</a></div>
}
