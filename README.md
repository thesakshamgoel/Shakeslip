# Shakeslip v4: Studio and Slip

Studio is where a business creates and sends invoices. Slip is where a client receives them. One login works for both.

## Run it locally

You need Node 20+ and Bun 1.4+.

```bash
# 1. API (port 8787). Creates its own SQLite database in server/data/
cd server && bun install && cp .env.example .env && bun run dev

# 2. Web app (port 5173), in a second terminal
cd web && npm install && npm run dev
```

Open http://localhost:5173. Emails are saved to the in-app "Test mailbox" and printed in the API terminal, so you can follow invite and reset links without an email provider. To send real email, put a Resend key in `server/.env`.

## GitHub Pages preview

Pushing to `main` publishes a preview to https://thesakshamgoel.github.io/Shakeslip/ (`.github/workflows/pages.yml`). Pages cannot run the server, so the build sets `VITE_STATIC_PREVIEW=1`: the home page, FAQ, legal pages and Google sign-in work (Firebase only; the app saves nothing). Studio, Slip and invoices show as opening soon. The Pages domain must be in the Firebase authorised domains. For the full app on a free server, see `deploy/README.md`.

## Checks

```bash
cd server && bun run check && bun test     # API types and the end-to-end API tests
cd web && npx tsc --noEmit && npm run build
```

## How it fits together

- **Accounts:** email and password, hashed with Argon2id, sessions in HttpOnly cookies, rate-limited login, password reset by email.
- **Linking:** a business invites a client by email (single-use link, 14 days), by WhatsApp message, or by a link/QR/code the client uses to request a connection. Every query checks ownership, so a client only ever sees invoices on their own connection.
- **Invoice types:** each business designs its own (fields, columns, tax, numbering prefix). Sent invoices keep a snapshot of the type they were sent with.
- **Numbering:** assigned at send time, per type and financial year, so the series has no gaps.
- **Automation:** emails and in-app updates on send, view, payment and reminders. Reminders run from the group's rules.
- **Payments:** recorded by hand for now (UPI, bank, cash). The client can say "I have paid" and the business confirms.

## What is new in v4

- Your logo (four sizes) and your clients' logos on invoices. Clients can add their own logo in Slip.
- Full client details from the original: title (Mr., Ms., Mrs., Dr., M/s.), kind attention, address, area, city, PIN, PAN, GSTIN with state.
- Smart paste: paste a signature or message and the client form fills itself.
- Scope builder from the original: service chips write the first line and the banner; prefix formats; category; completion date; units per line.
- Payment terms with an automatic schedule (advance and balance with a slider, full advance, on completion, Net 15/30, custom); 12 currencies with amount in words.
- Bank, UPI QR and payment mobile can each be switched on or off per invoice.
- Signature: draw, type in six handwriting styles, or upload.
- Terms pages grouped under numbered headings, Match services, your own formatted terms, and an Annexure page written from the scope.
- Void an invoice with a reason. Nine designs, including Corporate, Nordic Mint and Sunset Coral.
- Motion: the part of the invoice you are editing lights up, stamps land, the hero tilts and drifts, a live design showcase and smart-paste demo on the home page.

## What was new in v3

- Home page that shows the product working (write, send, viewed, paid).
- The original Shakeslip invoice layout as the default design, with five more designs. Multi-page: invoice plus Terms pages.
- Guided editor in five steps with undo/redo, item and rate memory, profession shortcuts, smart Terms, and a pre-flight check.
- IGST or CGST/SGST chosen from the two GSTINs or states; GSTIN check-digit validation; tax-inclusive prices; amount in words.
- UPI scan-to-pay QR on invoices and a one-tap UPI button for clients on a phone; bank details; typed or uploaded signature.
- Sent invoices are frozen with the business details they were sent with. Duplicate any invoice into a new draft.
- Search everything with Cmd/Ctrl + K. The logo ring spins while the app is working.
- Full Terms of use and Privacy policy pages.

## Not done yet

See CHANGES.txt, "Before launch".
