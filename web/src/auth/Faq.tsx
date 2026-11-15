import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LogoMark } from '../brand/icons'
import { spring, springSoft } from '../lib/motion'
import './legal.css'

type Q = { q: string; a: string }
/* Every answer describes what the product does today. Update this list when a feature changes. */
const FAQ: { id: string; title: string; items: Q[] }[] = [
  { id: 'start', title: 'Getting started', items: [
    { q: 'What are Studio and Slip?', a: 'Studio is where a business or freelancer creates and sends invoices. Slip is the free inbox where clients receive them, see what is due and mark payments. One login works for both.' },
    { q: 'How long does it take to send a first invoice?', a: 'Add a client, pick an invoice type, tap what you did, check the amounts and send. Most of the invoice fills itself from your settings and earlier invoices.' },
    { q: 'Does it work on my phone?', a: 'Yes. Shakeslip runs in the browser on phones, tablets and computers, and you can add it to your home screen from the browser menu, so it opens like an app.' },
  ] },
  { id: 'invoices', title: 'Invoices and GST', items: [
    { q: 'Does it handle GST?', a: 'Yes. Add your GSTIN and your client\'s, and Shakeslip uses IGST for supplies to another state and CGST plus SGST within your state. GSTINs are checked for typing mistakes. Your CA should still review your filings.' },
    { q: 'How are invoices numbered?', a: 'Numbers are given only when you send, in order and without gaps, per invoice type and financial year, for example INV/2026-27/0001. Drafts have no number.' },
    { q: 'Can I change an invoice after sending it?', a: 'No. A sent invoice is frozen so both of you see the same document. You can void it with a reason your client sees, or duplicate it into a new draft.' },
    { q: 'Can I add my own terms?', a: 'Yes. Pick clauses from the library, write your own, add an annexure, and set default terms in Settings. Suggested terms are a starting point; you are responsible for what you send.' },
    { q: 'Can I download a PDF?', a: 'Yes. Download PDF gives an A4 file that matches the on-screen invoice, named after the invoice number.' },
  ] },
  { id: 'clients', title: 'Clients', items: [
    { q: 'How do I connect with a client?', a: 'Invite them by email or WhatsApp, or share your connect link or QR code. Connect codes refresh every 24 hours, and invite links last 24 hours.' },
    { q: 'Does my client need an account?', a: 'They get an email copy either way. With a free Slip account they also see every invoice from you in one inbox, can confirm their details and can mark a payment as made.' },
  ] },
  { id: 'pay', title: 'Payments and reminders', items: [
    { q: 'Does Shakeslip take payments?', a: 'No. Your client pays you directly by UPI, bank transfer, cash or card. Invoices can carry a UPI QR with the exact amount. You record what came in, and the balance updates.' },
    { q: 'How do reminders work?', a: 'Shakeslip reminds your client by email and in Slip on the schedule you choose: before the due date, on it, and every few days once late. You can change the schedule per group or per invoice, or turn it off.' },
    { q: 'Can I charge a late fee?', a: 'You can set a percent a month or a flat amount with a grace period. Reminders mention the fee, and you bill it on a separate invoice. Put a late-fee clause in your terms so your client has agreed to it.' },
  ] },
  { id: 'privacy', title: 'Privacy and your data', items: [
    { q: 'Who can see my invoices?', a: 'Only you and the client each invoice is addressed to. Every request is checked on the server against your account.' },
    { q: 'Do you use cookies or trackers?', a: 'One essential cookie keeps you signed in. There are no ads and no tracking cookies.' },
    { q: 'Is my data used to train AI?', a: 'No.' },
    { q: 'Can I delete my account?', a: 'Yes, from Settings, Account and privacy.' },
  ] },
]

function Item({ id, q, open, onToggle }: { id: string; q: Q; open: boolean; onToggle: () => void }) {
  return (
    <motion.div id={`q-${id}`} layout="position" className="faq-i" transition={spring}>
      <button className="faq-q tap" aria-expanded={open} onClick={onToggle}>
        <span>{q.q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring} className="faq-chev"><ChevronDown size={18} aria-hidden /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && <motion.p className="faq-a" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={springSoft}>{q.a}</motion.p>}
      </AnimatePresence>
    </motion.div>
  )
}

/* Public questions and answers. The open question is kept in the URL so it can be shared. */
export function Faq() {
  const nav = useNavigate()
  const [p, setP] = useSearchParams()
  const [open, setOpen] = useState<string>(p.get('q') ?? '')
  /* a shared link opens on its question */
  const [first] = useState(open)
  useEffect(() => { if (first) document.getElementById(`q-${first}`)?.scrollIntoView({ block: 'center' }) }, [first])
  const toggle = (k: string) => { const v = open === k ? '' : k; setOpen(v); setP(v ? { q: v } : {}, { replace: true }) }
  return (
    <main className="lg">
      <header className="lg-top">
        <Link to="/" className="lg-brand"><LogoMark size={28} /><span>Shakeslip</span></Link>
        <button className="lg-back tap" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))}><ArrowLeft size={16} aria-hidden />Back</button>
      </header>
      <motion.article className="lg-doc" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}>
        <h1>Questions and answers</h1>
        <p className="lg-lead">Short answers about how Shakeslip works.</p>
        <LayoutGroup>
          {FAQ.map((g) => (
            <motion.section key={g.id} layout="position" transition={spring} className="faq-g" aria-labelledby={`faq-${g.id}`}>
              <h2 id={`faq-${g.id}`}>{g.title}</h2>
              {g.items.map((q, i) => <Item key={q.q} id={`${g.id}-${i}`} q={q} open={open === `${g.id}-${i}`} onToggle={() => toggle(`${g.id}-${i}`)} />)}
            </motion.section>
          ))}
        </LayoutGroup>
        <p className="lg-other">Still stuck? Write to the business that sent you an invoice, or see the <Link to="/terms">terms</Link> and <Link to="/privacy">privacy policy</Link>.</p>
      </motion.article>
    </main>
  )
}
