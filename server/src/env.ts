import { z } from 'zod'

/* Validated at startup: the server refuses to start with a clear message if config is wrong. */
const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  APP_URL: z.string().url().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_PATH: z.string().min(1).default('./data/shakeslip.db'),
  RESEND_API_KEY: z.string().optional().transform((v) => v || undefined),
  MAIL_FROM: z.string().default('Shakeslip <no-reply@example.com>'),
  /* a Chromium-based browser used to render PDFs (Chrome, Chromium, Brave, Edge) */
  PDF_BROWSER: z.string().default('/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
  process.exit(1)
}
export const env = parsed.data
export const isProd = env.NODE_ENV === 'production'
