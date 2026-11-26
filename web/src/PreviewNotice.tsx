import { Link } from 'react-router-dom'
import { LogoMark } from './brand/icons'
import { Button } from './components/Button'
import { PREVIEW_TEXT, PREVIEW_TITLE } from './lib/staticPreview'

/* Stands in for every page that needs the server. */
export default function PreviewNotice() {
  return (
    <main className="land"><div className="land-in">
      <LogoMark size={64} />
      <h1 className="land-h">{PREVIEW_TITLE}</h1>
      <p className="land-p">{PREVIEW_TEXT}</p>
      <Link to="/"><Button variant="primary">Go home</Button></Link>
    </div></main>
  )
}
