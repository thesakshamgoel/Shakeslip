import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { env } from './env.ts'

mkdirSync(dirname(env.DB_PATH), { recursive: true })
export const db = new Database(env.DB_PATH, { create: true })
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')

/* Dates are UTC ISO strings. Money is integer paise. Deletes are soft (deleted_at). */
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL, terms_version TEXT NOT NULL, terms_accepted_at TEXT NOT NULL, created_at TEXT NOT NULL, deleted_at TEXT);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS client_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id), company TEXT NOT NULL DEFAULT '', gstin TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '', pin TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL UNIQUE REFERENCES users(id), name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  gstin TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
  auto_approve INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS invoice_types (id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), name TEXT NOT NULL, schema TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), name TEXT NOT NULL, type_id TEXT, theme TEXT NOT NULL DEFAULT 'onyx',
  due_days INTEGER NOT NULL DEFAULT 7, reminders TEXT NOT NULL, created_at TEXT NOT NULL, deleted_at TEXT);
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), group_id TEXT, user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', company TEXT NOT NULL DEFAULT '', gstin TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, invite_hash TEXT, invite_expires TEXT, created_at TEXT NOT NULL, deleted_at TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS links_biz_user ON links(business_id, user_id) WHERE user_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS links_invite ON links(invite_hash);
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), link_id TEXT NOT NULL REFERENCES links(id), type_id TEXT NOT NULL, type_snapshot TEXT NOT NULL,
  number TEXT, seq INTEGER, fy TEXT, theme TEXT NOT NULL, bill_to TEXT NOT NULL, items TEXT NOT NULL, fields TEXT NOT NULL,
  gst_pct REAL NOT NULL DEFAULT 0, discount INTEGER NOT NULL DEFAULT 0, advance INTEGER NOT NULL DEFAULT 0, issued TEXT NOT NULL, due TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft', sent_at TEXT, viewed_at TEXT, created_at TEXT NOT NULL, deleted_at TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS inv_number ON invoices(business_id, number) WHERE number IS NOT NULL;
CREATE INDEX IF NOT EXISTS inv_link ON invoices(link_id);
CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES invoices(id), amount INTEGER NOT NULL, method TEXT NOT NULL, ref TEXT NOT NULL DEFAULT '', paid_at TEXT NOT NULL, status TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES invoices(id), kind TEXT NOT NULL, text TEXT NOT NULL, audience TEXT NOT NULL DEFAULT 'both', at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS ev_inv ON events(invoice_id);
CREATE TABLE IF NOT EXISTS annotations (id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES invoices(id), page INTEGER NOT NULL, x REAL NOT NULL, y REAL NOT NULL, text TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS ann_inv ON annotations(invoice_id);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, body TEXT NOT NULL, link TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, read_at TEXT);
CREATE INDEX IF NOT EXISTS notif_user ON notifications(user_id, created_at);
CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY, to_email TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, link TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reminders_sent (invoice_id TEXT NOT NULL, key TEXT NOT NULL, PRIMARY KEY (invoice_id, key));
CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL, at TEXT NOT NULL);
`)

/* Additive migrations: new columns are added in place, existing data is kept. */
function ensureColumn(table: string, col: string, def: string) {
  const cols = db.query(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!cols.some((c) => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`)
}
for (const [col, def] of [['pan', "TEXT NOT NULL DEFAULT ''"], ['website', "TEXT NOT NULL DEFAULT ''"], ['state', "TEXT NOT NULL DEFAULT ''"], ['upi_id', "TEXT NOT NULL DEFAULT ''"],
  ['bank_name', "TEXT NOT NULL DEFAULT ''"], ['account_name', "TEXT NOT NULL DEFAULT ''"], ['account_no', "TEXT NOT NULL DEFAULT ''"], ['ifsc', "TEXT NOT NULL DEFAULT ''"],
  ['profession', "TEXT NOT NULL DEFAULT 'general'"], ['signature', "TEXT NOT NULL DEFAULT '{}'"]] as const) ensureColumn('businesses', col, def)
ensureColumn('businesses', 'area', "TEXT NOT NULL DEFAULT ''")
ensureColumn('businesses', 'pin', "TEXT NOT NULL DEFAULT ''")
ensureColumn('users', 'photo_url', "TEXT NOT NULL DEFAULT ''")
ensureColumn('client_profiles', 'state', "TEXT NOT NULL DEFAULT ''")
for (const col of ['honorific', 'area', 'pan', 'logo']) ensureColumn('client_profiles', col, "TEXT NOT NULL DEFAULT ''")
for (const col of ['honorific', 'attention', 'area', 'pin', 'pan', 'logo']) ensureColumn('links', col, "TEXT NOT NULL DEFAULT ''")
ensureColumn('businesses', 'logo', "TEXT NOT NULL DEFAULT ''")
ensureColumn('businesses', 'logo_size', "TEXT NOT NULL DEFAULT 'm'")
for (const [col, def] of [['phones', "TEXT NOT NULL DEFAULT '[]'"], ['qr_image', "TEXT NOT NULL DEFAULT ''"], ['default_theme', "TEXT NOT NULL DEFAULT 'classic'"], ['emails', "TEXT NOT NULL DEFAULT '[]'"], ['default_layout', "TEXT NOT NULL DEFAULT 'classic'"], ['default_terms', "TEXT NOT NULL DEFAULT '[]'"], ['default_custom_terms', "TEXT NOT NULL DEFAULT ''"]] as const) ensureColumn('businesses', col, def)
ensureColumn('invoices', 'extra', "TEXT NOT NULL DEFAULT '{}'")
ensureColumn('invoices', 'void_reason', "TEXT NOT NULL DEFAULT ''")
ensureColumn('invoices', 'source_id', 'TEXT')
for (const [col, def] of [['needs_accept', 'INTEGER NOT NULL DEFAULT 0'], ['accepted_at', 'TEXT'], ['accepted_name', "TEXT NOT NULL DEFAULT ''"], ['accepted_sig', "TEXT NOT NULL DEFAULT ''"], ['delivery', "TEXT NOT NULL DEFAULT 'shakeslip'"]] as const) ensureColumn('invoices', col, def)
ensureColumn('businesses', 'automation', "TEXT NOT NULL DEFAULT '{}'")
ensureColumn('businesses', 'catalogue', "TEXT NOT NULL DEFAULT '{\"services\":[],\"packages\":[]}'")
ensureColumn('payments', 'kind', "TEXT NOT NULL DEFAULT 'payment'")
ensureColumn('payments', 'note', "TEXT NOT NULL DEFAULT ''")
ensureColumn('businesses', 'slug_at', "TEXT NOT NULL DEFAULT ''")
ensureColumn('links', 'state', "TEXT NOT NULL DEFAULT ''")
for (const [col, def] of [['project', "TEXT NOT NULL DEFAULT ''"], ['terms', "TEXT NOT NULL DEFAULT '[]'"], ['tax_inclusive', 'INTEGER NOT NULL DEFAULT 0'], ['from_snapshot', 'TEXT']] as const) ensureColumn('invoices', col, def)

export const uid = () => crypto.randomUUID()
export const nowIso = () => new Date().toISOString()
export const audit = (userId: string | null, action: string, entity: string, entityId: string) =>
  db.query('INSERT INTO audit (id,user_id,action,entity,entity_id,at) VALUES (?,?,?,?,?,?)').run(uid(), userId, action, entity, entityId, nowIso())

/* One-off: groups used to be created with a fixed "classic" look that overrode the business's default design.
   An empty look now means "use my default"; move the old automatic ones over so the default applies. */
if ((db.query('PRAGMA user_version').get() as { user_version: number }).user_version < 1) {
  db.exec("UPDATE groups SET theme = '' WHERE theme IN ('classic', 'onyx')")
  db.exec('PRAGMA user_version = 1')
}
