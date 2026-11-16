# Shakeslip: project handoff

Everything someone new needs to continue this project. Written 2026-11-16. Nothing here is a secret: the Firebase web config is public by design, and no keys or passwords are listed.

## 1. What it is

Shakeslip is an invoicing product for India (INR only, GST-aware), built as a website and an installable PWA. One account has two sides:

- **Studio** is the sender. A freelancer or studio sets up a business, adds clients, builds invoices, sends them, records payments and sends reminders.
- **Slip** is the receiver. A client has an inbox of invoices sent to them, can accept (with a signature), request changes with numbered marks on the invoice, and tell the business they paid.

Payments happen outside the app (UPI, bank, cash). The app records them; it does not move money. One person can use both Studio and Slip on the same login, and they share personal details.

The user runs this as a personal project. They are direct and blunt and expect the same back (see section 12).

## 2. Where things live

- Local folder: `/Users/sakshamgoel/Downloads/INV Studio/`
  - `v5/` is the current app. **Work only in v5.** `v2` to `v4` are older versions kept for history. Do not overwrite them.
  - `promo-v1/`, `promo-v2/` are separate promo-video projects. `promo-v2/` also holds the **browser test scripts** (`*.mjs`) used for verification.
  - `Logos/` holds the user's brand SVGs.
- GitHub: `https://github.com/thesakshamgoel/Shakeslip` (public). Branch `main`. Push directly to `main`.
- Live site: `https://shakeslip.fly.dev` (Fly.io, app name `shakeslip`, region `sin`).
- An older, unrelated repo `Invoice-Studio` is where the original mobile app idea came from. Traits borrowed from it: bottom nav, sheets with a handle, nav hidden with the keyboard, manifest shortcuts.

## 3. Stack

- **Server** (`v5/server`): Bun, Hono, `bun:sqlite`, zod. Puppeteer-core drives a Chromium to render PDFs. `jose` verifies Firebase ID tokens.
- **Web** (`v5/web`): Vite, React, TypeScript, react-router (BrowserRouter), `motion/react` (Framer Motion), lucide-react, Firebase JS SDK (Google sign-in only, loaded on demand).
- No UI framework. Custom components for Select, DatePicker, Chip, Dialog, Toast, etc. Design tokens in `web/src/styles/tokens.css`.
- Money is stored as integer paise. Dates are UTC ISO strings. Users are soft-deleted (`deleted_at`).
- Production is **one container** that serves both the API and the built website (same origin, so cookies work). See `Dockerfile` and `fly.toml`.

## 4. Repo map (v5)

```
v5/
  Dockerfile, fly.toml, .dockerignore   deploy
  CHANGES.txt                            dated change log (keep updating it)
  PLAN-v5.md                             numbered backlog
  CREDITS.txt, README.md
  server/
    src/index.ts        app wiring, security headers, serves the site in production
    src/db.ts           schema + additive migrations (ensureColumn), one-off PRAGMA user_version migration
    src/auth.ts         sessions (httpOnly cookie ss_session, 30 days), requireUser
    src/google.ts       verifies Firebase ID tokens (no service account needed)
    src/shared.ts       syncShared(): Studio and Slip share personal details, fill-if-empty both ways
    src/access.ts       bizOf, invoiceDto, fromDetails, paidSum, ownership helpers
    src/routes/         account, business, invoices, inbox (Slip side), links (clients/invites), stats, automation, misc, dev (non-production only)
    src/schemas.ts      every request body (zod)
    src/security.ts     headers, CSRF guard, rate limiting, fail(c,status,code,msg)
    src/notify.ts, mailer.ts, reminders.ts, pdf.ts, seed.ts, demo.ts
    test/flow.test.ts   15 tests (bun test)
  web/
    src/App/routes      react-router tree; Studio and Slip under AppShell
    src/components/     AppShell (shell, tabs, topbar), Account (avatar, switcher), Select, DatePicker, Dialog, BlockEditor, Feed, ...
    src/mobile/         phone layer: swipe.tsx, swipeX.ts, SlideOutlet.tsx, PullToRefresh.tsx, basics.ts
    src/studio/         Studio screens: Dashboard, Invoices, InvoiceDetail, Editor + editor/ steps, Clients, Settings, Setup, PaymentDialog, InviteDialog
    src/slip/           Slip screens: Inbox, Detail, Connections, Details (My details)
    src/auth/           Login, Signup, Social (Google), Guard
    src/landing/        marketing page (Hero etc.)
    src/lib/            api.ts, session, useApi, firebase.ts, paste.ts, welcome.ts, theme.ts, types.ts
    public/             manifest.webmanifest, brand/ logos
    index.html          includes the inline loader so the logo paints first
```

## 5. Run it locally

Two processes, both needed:

```
cd v5/server && bun src/index.ts          # API on :8787
cd v5/web    && npx vite                  # site on :5173, proxies /api to :8787
```

- **Restart the API after any server change** (it does not hot reload here): `kill $(pgrep -f "bun src/index")` then `nohup bun src/index.ts &`. `pkill -f` did not work on this Mac.
- Checks: `cd v5/web && npx tsc --noEmit`, `cd v5/server && bunx tsc --noEmit && bun test`. All must pass before a commit.
- Local demo data: on the landing page and `/login` (dev only) there are "Try as demo business / client" buttons. They call `/api/dev/demo`, which is **not mounted in production** (`isProd`). Demo logins are `studio@demo.test` and `client@demo.test` (dev database only).

## 6. Config

`server/.env` (git-ignored; see `.env.example`):
- `PORT`, `APP_URL`, `NODE_ENV`, `DB_PATH`, `PDF_BROWSER` (path to a Chromium; Brave on the Mac, `/usr/bin/chromium` in the container)
- `FIREBASE_PROJECT_ID=shakeslip` turns on Google sign-in
- `RESEND_API_KEY`, `MAIL_FROM` for real email. **Not set**, so emails only land in the in-app test mailbox.
- `WEB_DIST` (built site folder, production)

`web/.env` (git-ignored; see `.env.example`): `VITE_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID`. These identify the Firebase project and are public by design. For production they are passed as build args in `fly.toml`.

Firebase project: `shakeslip`. Google provider is enabled. Authorized domains must include `localhost` and `shakeslip.fly.dev`.

## 7. Deploying

Hosting is Fly.io, one machine (1 GB, sleeps when idle) plus a 1 GB volume `shakeslip_data` mounted at `/data` (holds the SQLite file), with daily snapshots (5 kept). Region is **Singapore (`sin`)**: Mumbai is closed to new resources.

```
cd v5
flyctl deploy --app shakeslip --remote-only
```

- `flyctl` is **not installed system-wide**. A verified copy was downloaded to the session scratchpad (`/private/tmp/claude-501/fly/bin/flyctl`), which can be wiped. Reinstall it if missing (download the macOS arm64 release from the superfly/flyctl GitHub releases and check the checksum). The login is stored on the Mac.
- The Docker image has Chromium for PDFs. It builds on Fly's remote builder; Docker is not installed locally.
- After a deploy, check `https://shakeslip.fly.dev/healthz` and log in.
- There is **no GitHub Pages site any more** (retired: it had no API behind it). The Pages workflow was deleted.

## 8. How the important parts work

**Auth.** Cookie sessions stored hashed in SQLite. Email + password (argon2id via `Bun.password`) or Google via Firebase: the browser gets a Firebase ID token, `POST /api/account/google` verifies it with Google's public keys. Sign in and sign up are one flow: an email with no account goes straight to sign-up with the email prefilled (login returns `ERR-AUTH-404`, the app navigates on), and a new Google account goes to a short "Welcome" step for role + terms. Signing up with an existing email and the right password just signs in. Login by email reveals whether an account exists (deliberate, the user asked for it; limited to 40 attempts/15 min per IP). The production `Cross-Origin-Opener-Policy` is `same-origin-allow-popups`; `same-origin` breaks the Google popup.

**Accounts on a device.** `useAccounts` remembers name, email and photo in `localStorage` (`ss-accounts`), never a password or session. Switching accounts = sign out and open login with that email filled in. True instant switching would need multi-session support on the server (not built).

**Shared details.** `syncShared(userId)` copies phone, GSTIN, PAN, address, area, PIN, city, state and company/business name between the Slip profile and the Studio business, filling only empty fields. It runs on `GET /me`, `PUT /me` and business create/update.

**Invoices.** Draft, then send. Numbers are issued at send time per series and financial year. Sent invoices are frozen (`bill_to`, `from_snapshot`). Client phone shown to the studio prefers the client's own saved number (`users.phone`).

**Payments.** `payments` rows with `kind` (payment, advance, tds, writeoff, refund) and `status` (`confirmed`, `claimed`, `voided`). Only confirmed rows count toward `paidSum`. Editing (`PUT /payments/:pid`) and removing (`POST /payments/:pid/void`) keep history: old values go to the activity log, removed rows stay struck through with the reason, the client is notified. Status recalculates through `settle()`.

**Design defaults.** The business has a default theme/layout. Groups have an optional look (empty string means "use my default"). Seeded groups used to force "classic", which hid the default; a one-off migration (`PRAGMA user_version = 1`) reset those.

**Terms editor.** Pasting multiple lines becomes one clause or row per line, cut at word breaks (`lib/paste.ts`). Previously newlines were flattened and the text truncated at 600 characters.

**Dropdowns.** `Select` takes an optional `custom` prop that adds "Custom..." for free-text or numeric values (line and banner wording, deliverable category, custom-field choices, GST rate). It is deliberately NOT on dropdowns that map to fixed values (state, group, look, invoice type, tax, sort, filters).

**Add a client.** The popup starts with "Send your link" (the business's connect link: share sheet, WhatsApp, SMS, Email, Copy). Below it, the personal-invite form ("Add and send link") creates a one-time 24-hour invite and shows the same send options plus a QR.

## 9. The phone layer (`web/src/mobile/`)

Phone means viewport at most 900px. Design follows common phone-app habits (Jacob's law).

- Floating bottom tab bar, hidden while the keyboard is up (visualViewport). The invoice editor is a full-screen flow with a close button and no tab bar.
- **Swipe engine** (`swipe.tsx`, `swipeX.ts`, `SlideOutlet.tsx`): the current screen follows the finger one to one through a Framer motion value. On release the old screen leaves from where the finger let go and the next one slides in edge to edge beside it, so there is no fade and no gap. Edges rubber-band. The editor claims swipes for its steps (`useSwipeClaim`) and obeys the same validation as the Next button. Swipes are ignored in inputs, sideways-scrolling rows, sheets and the zoom area.
- Pull to refresh (`PullToRefresh.tsx`) fires a global `ss-refresh` event that `useApi` listens for.
- Bottom sheets (`Dialog`) have a grab handle and drag to dismiss.
- Editor on phone: compact header, steps as numbered circles (tapping one returns to Edit and shows "Step N of 6: name"), one icon button at the bottom to flip between Preview and Edit.
- The installed app, when signed out, opens straight on sign-in (not the marketing page). A device that has signed in before no longer shows the new-user copy.
- `index.html` contains the loader markup and CSS inline with the logo preloaded, so the spinning logo paints with the first bytes.
- Performance choices: solid bars (no backdrop blur) and no glow animation on phone.

## 10. Testing

- `bun test` runs 15 server tests in `server/test/flow.test.ts` (journey, security, payments, edit/void, reminders, acceptance, logos, etc.).
- UI verification uses `puppeteer-core` + Brave headless with mobile emulation and touch. Scripts live in `promo-v2/` (`swipetest.mjs`, `swipefeel.mjs`, `edtest.mjs`, `paytest.mjs`, `customtest.mjs`, `dscroll.mjs`, ...). Screenshots go to the session scratchpad.
- Known test quirk: puppeteer `click()` sometimes misses while a page is still animating in; clicking via `page.evaluate(el.click())` is reliable.
- Real phone: a Samsung S24 Ultra over USB. `~/Library/Android/sdk/platform-tools/adb`; run `adb reverse tcp:5173 tcp:5173` and `tcp:8787` after reconnecting. The old installed WebAPK loads from `localhost:5173` (a **separate dev database** from the live site). The real app is meant to be installed from `https://shakeslip.fly.dev` (Chrome menu, Install app). Do not tap the phone while the user is using it; read-only screenshots via `adb exec-out screencap` are fine.

## 11. State right now (honest)

Verified by automated tests or emulated browser runs only. **Nothing has been confirmed on the real phone** in the latest rounds, and Google sign-in on the live site has not been confirmed end to end by the user after the opener-policy fix.

Open or unfinished:
- **Dropdown double scroll**: reported by the user, could not be reproduced headless. Dropdown lists were resized to fit their scrolling parent and touch scroll chaining reduced, but the root cause is unconfirmed. Ask which screen, phone or desktop, and what exactly scrolls twice.
- Invoices list on phone: filter bottom sheet (sort/group/view/status) and swipe-row actions (remind, duplicate) not built.
- Clients page header is crowded on phone (Connect link, New group, Add a client).
- Not built: `navigator.share` on invoice detail, skeleton loaders (empty `aria-busy` blocks remain), pinch zoom on invoice preview.
- PLAN-v5 backlog items still open: 10 (beyond terms), 14, 20, 21, 24, 26, 27, 29, 37 to 40, 42, 43, 55.
- Apple sign-in button says "coming soon".
- Real email needs a Resend key and a verified sender domain.
- No tested restore from the Fly volume snapshots. Daily snapshots exist.
- The Fly machine auto-stops, so the first visit after idle is slow.
- Pre-ship checklist (below) has not been run in full.
- Template files to delete by hand (an earlier delete was blocked): `v*/web/public/vite.svg`, `v*/web/public/icons.svg`, `v5/web/src/home.css` (unused).

## 12. The user's standing rules (follow these)

From their global instructions ("TSG Tweaks"):

- Be direct and blunt. Say plainly what was verified and what was not. No false claims, no invented numbers or testimonials.
- Plan and ask before big builds; do not overwrite earlier versions (make a new versioned folder). Keep `CHANGES.txt` updated per change.
- Visual: no AI gradients or decorative glows, **no italics**, no emojis, no common default fonts, flat cards, concentric radii, tabular numbers, tight spacing, 44px minimum tap targets, tap feedback on everything tappable, no linear easing, animate transform and opacity only (120 Hz), no spinners everywhere (use skeletons), honour reduced motion, system cursor only, never edit the logo.
- UX: no double submits, keyboard never covers inputs, no blank screens (design empty states), no raw error text, sync filters/tabs to the URL, modals trap focus.
- Security: secrets only in env files (git-ignored), validate env at startup, server-side validation (zod), ownership checks on every query, rate limits, security headers, no source maps in production, run the dependency audit before shipping.
- Git: commit only when asked (this user has been asking to push as they go), never force-push, scan staged changes for secrets, new repos private by default (this one was made public with their explicit approval to enable Pages; it is now only a code repo).
- **Never use the user's personal brush logo.** Only the Shakeslip logos in `Logos/` and `web/public/brand/`.
- Be careful with personal data: keep the user's name and email out of requests to outside services.
- Before calling anything shipped, run the pre-ship check: placeholder purge (no dummy data, lorem ipsum, test accounts), full security check, UX pass (mobile keyboard, clipped descenders, double-submit locks, contrast in light and dark), SEO and legal pass (per-page meta, canonical redirect, sitemap, error pages, terms/privacy consent logging), git and credits, then report what passed, what failed and what needs the user.

Working preferences seen in this project: the user wants custom controls (not native selects), no truncation with "..." (text should wrap), Apple-like motion, distinct designs, and "seamless, not like it loads another page" motion. They give short messages mid-task; treat them as additions to the current work.

## 13. Gotchas

- Server changes need an API restart locally; client changes hot reload.
- The `main`/page transform matters on phone: a transformed ancestor breaks `position: fixed` (the editor's preview bar uses `position: sticky` for that reason).
- `ensureColumn` is the migration pattern (additive only). One-off data fixes use `PRAGMA user_version`.
- Production serves static files and returns 404 for missing asset-like paths; everything else falls back to `index.html`.
- Demo data and dev-only routes must never reach production. Check `isProd` guards before adding new dev helpers.
- Do not use `window.prompt` for new flows (a few older ones remain); use the Dialog component.
