import { LogoMark } from './brand/icons'

/* Shown while Shakeslip is being updated (the server answers 503). */
export default function Maintenance() {
  return (
    <main className="land"><div className="land-in">
      <LogoMark size={64} spinning />
      <h1 className="land-h">Back in a few minutes</h1>
      <p className="land-p">We are updating Shakeslip. Your invoices and details are safe. Please try again shortly.</p>
    </div></main>
  )
}
