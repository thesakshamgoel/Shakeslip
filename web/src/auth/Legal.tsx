import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { LogoMark } from '../brand/icons'
import { springSoft } from '../lib/motion'
import { COOKIES, LEGAL_UPDATED, LICENCE, PRIVACY, TERMS, type Section } from './legalText'
import './legal.css'

function LegalPage({ title, lead, sections }: { title: string; lead: string; sections: Section[] }) {
  const nav = useNavigate()
  const id = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return (
    <main className="lg">
      <header className="lg-top">
        <Link to="/" className="lg-brand"><LogoMark size={28} /><span>Shakeslip</span></Link>
        <button className="lg-back tap" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))}><ArrowLeft size={16} aria-hidden />Back</button>
      </header>
      <motion.article className="lg-doc" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}>
        <h1>{title}</h1>
        <p className="lg-lead">{lead}</p>
        <p className="lg-meta">Last updated {LEGAL_UPDATED}. Draft for legal review before launch.</p>
        <nav className="lg-toc" aria-label="Contents"><ol>{sections.map((s) => <li key={s.h}><a href={`#${id(s.h)}`}>{s.h}</a></li>)}</ol></nav>
        {sections.map((s, i) => (
          <section key={s.h} id={id(s.h)}>
            <h2><span className="num">{i + 1}.</span> {s.h}</h2>
            {s.p.map((p, k) => <p key={k}>{p}</p>)}
          </section>
        ))}
        <p className="lg-other">See also: <Link to="/faq">FAQ</Link> · <Link to="/terms">Terms of use</Link> · <Link to="/privacy">Privacy policy</Link> · <Link to="/cookies">Cookie policy</Link> · <Link to="/licence">Software licence</Link></p>
      </motion.article>
    </main>
  )
}

export const Terms = () => <LegalPage title="Terms of use" lead="Please read these carefully. By creating an account you agree to them." sections={TERMS} />
export const Privacy = () => <LegalPage title="Privacy policy" lead="What we collect, why, and who can see it. In plain words." sections={PRIVACY} />

export const Cookies = () => <LegalPage title="Cookie policy" lead="Short, because we keep it minimal." sections={COOKIES} />
export const Licence = () => <LegalPage title="Software licence and acceptable use" lead="What you can do with Shakeslip, and what you cannot." sections={LICENCE} />
