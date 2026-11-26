import { Link } from 'react-router-dom'
import { PreviewAccount } from './auth/PreviewAccount'
import { LogoMark } from './brand/icons'

/* Stands in for every page that needs the server. */
export default function PreviewNotice() {
  return (
    <main className="land"><div className="land-in">
      <Link to="/" aria-label="Shakeslip home"><LogoMark size={64} /></Link>
      <PreviewAccount page />
      <Link to="/" className="au-link">Go home</Link>
    </div></main>
  )
}
