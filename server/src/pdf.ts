import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import puppeteer, { type Browser } from 'puppeteer-core'
import { env } from './env.ts'

/* Real PDFs: render the same invoice page the person designed in a headless browser and save it as A4.
   The browser opens a print-only page that needs a signed token valid for two minutes. */
const SECRET = randomBytes(32)
export function printToken(invoiceId: string): string {
  const exp = Date.now() + 120_000
  const sig = createHmac('sha256', SECRET).update(`${invoiceId}.${exp}`).digest('base64url')
  return `${exp}.${sig}`
}
export function checkPrintToken(invoiceId: string, t: string): boolean {
  const [exp, sig] = t.split('.')
  if (!exp || !sig || Number(exp) < Date.now()) return false
  const want = createHmac('sha256', SECRET).update(`${invoiceId}.${exp}`).digest('base64url')
  return want.length === sig.length && timingSafeEqual(Buffer.from(want), Buffer.from(sig))
}

let browser: Promise<Browser> | null = null
const getBrowser = () => (browser ??= puppeteer.launch({ executablePath: env.PDF_BROWSER, headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] }))

export async function renderPdf(invoiceId: string): Promise<Uint8Array> {
  const b = await getBrowser()
  const page = await b.newPage()
  try {
    await page.goto(`${env.APP_URL}/print/${invoiceId}?t=${encodeURIComponent(printToken(invoiceId))}`, { waitUntil: 'networkidle0', timeout: 30_000 })
    await page.waitForFunction('window.__printReady === true', { timeout: 20_000 })
    return await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } })
  } finally { await page.close() }
}
