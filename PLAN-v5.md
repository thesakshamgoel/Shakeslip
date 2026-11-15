# Shakeslip v5: remaining work

Written 2026-11-15 from the owner's v5 feedback. Work happens in `v5/` (v2 to v4 stay untouched).
Run it: `cd v5/server && bun run dev` and `cd v5/web && npm run dev`, then open http://localhost:5173 and use the demo buttons on /login.
Rules: follow `~/.claude/CLAUDE.md` (TSG Tweaks). Type-check, test (`bun test`), build and look at screenshots before calling anything done.

## Done in this pass (v5)
- Invoice footer: small Shakeslip logo and name; page numbers removed.
- Left accent lines removed from invoice blocks.
- Terms only spill onto a second page when the first is actually full; a switch removes the Terms page.
- Loader uses the 512 px logo (no longer pixelated).
- Invoice preview: zoom slider, Fit, full screen, and scroll or drag to move when zoomed in.
- Draft editor: no inner scroll; only the page scrolls and the preview stays in view.
- Lines and amounts moved from the Scope step to the Amounts step.
- The app remembers the last page you were on (per Studio and Slip).
- /maintenance page added (404 already exists).

## Progress
Done 2026-11-16: items 1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13, 15, 16, 17, 18, 19, 22, 23, 25, 28, 31, 33, 34, 36, 41, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54; partly 11 (default terms in Settings; PDF upload still to do) and 35 (public FAQ; per-client FAQs still to do). See CHANGES.txt.

## P1: broken or confusing (do first)
1. **Custom controls instead of OS ones.** Build `Select` (listbox popover, keyboard, search when there are more than 8 options) and `DatePicker` (month grid, Today, keyboard, Indian date format). Replace every `<select>` and `<input type="date">`. Long option text must never be cut off with "...": wrap it or show the full text in the list.
2. **Errors and guidance.** One `Banner` component (info, warn, error) shown at the top of each editor step when something there is missing or invalid. Missing fields also get a red outline on the field and a red marker on the matching block of the invoice preview (extend the `focus` glow with an `errors` set).
3. **Selected state everywhere.** Audit every chip, radio card and tab (signature styles, designs, plans, titles) so the selected one is clearly highlighted: a filled background plus a check icon, not just an outline.
4. **Elements leaving the screen.** Check every step at 360, 768, 1024 and 1440 px wide. No horizontal scroll, and no nested scroll areas.
5. **Payment amounts UX.** Group the Amounts step into: Lines, Tax, Discount and advance, Payment schedule (preview the schedule as a mini timeline), Due date and reminders. Show the live total in a sticky summary bar at the bottom of the step.
6. **Terms are not dynamic enough.** Clauses fill from the invoice, but plan-based clauses must change with the payment plan (advance %, due date). Rebuild suggestions when the plan, services or due date change, unless the user has edited the terms by hand.

## P2: requested features
7. **QR codes.** In Settings, upload your own payment QR image or generate one from the UPI ID. Per invoice: no QR, UPI QR, or the uploaded QR. Restyle the connect QR in the site theme: rounded dots, brand colour, logo in the centre (the `qrcode` package can do module colours; draw rounded modules on a canvas).
8. **Several mobile numbers.** In Settings, a list of numbers, each with a label (Payments, Office, WhatsApp) and a default. Per invoice: choose which to show. Smart default: the number marked Payments shows in the bank block; for clients abroad, show WhatsApp.
9. **"What exactly did you do".** A switch in the Scope step: "Name the job", for example "Editing music video, Raat ko Jaagoon". Store `extra.job` (title, kind, reference). It feeds the banner ("Invoice towards editing of the music video Raat ko Jaagoon"), line 1, the email subject and the terms ({job} token). Suggest earlier job names for the same client.
10. **Terms editor.** A block editor for "Your own terms" and the Annexure: add Heading, Paragraph, Bullet list or Numbered list blocks; drag to reorder; delete. Store them as JSON blocks (the renderer in `docParts.tsx` already supports headings, points and paragraphs; add numbered lists).
11. **Terms sources.** (a) Default terms in Settings, used on every new invoice. (b) Upload a PDF of terms: store it (max 2 MB) and append its pages at print time with pdf.js; show it as an extra preview page. (c) The clause library, as now.
12. **Settings redesign.** Left sub-navigation with these sections:
    - Profile: you
    - Business: name, GSTIN, PAN, address, logo
    - Invoice defaults: default design and colour set, default type, numbering, default terms, signature
    - Getting paid: bank, UPI, QR, mobile numbers
    - Automation: reminders, auto-draft, overdue fee, notifications
    - Sending: email and WhatsApp
    - Connect link
    - Account and legal

    Save each section separately, and warn about unsaved changes.
13. **Automation settings.** Auto-draft recurring invoices (monthly retainers), overdue fee (percent per month or a flat amount, added as a line when overdue), reminder schedule (before, on and after the due date), and notification choices: email and in-app per event, plus a "Ping client" button that sends a reminder through email and WhatsApp. Server: extend `reminders.ts` and add an `automation` JSON column on `businesses`.
14. **Sending setup.** Email: custom sender name and a reply-to address. Optional SMTP or Resend key per business, stored server-side and never sent to the browser. WhatsApp: a share button now; Cloud API fields for later. Each channel can be Automatic or Ask me, and the Send dialog shows buttons for both.
15. **Designs.** Separate layout from colour:
    - **Layouts:** the current classic one, plus at least four distinct ones: Minimal (no tables, big total), Bold header band, Split sidebar (details down the left), Ledger (monospace, ruled).
    - **Colour sets:** 16 presets, half of them dark (Onyx, Midnight, Forest Night, Plum Dark and so on), and a custom picker for ink, paper and accent.
    - **Defaults:** set in Settings, changeable per invoice.
    - **Implementation:** `themes/layouts/*` components, each taking DocData and rendering through shared blocks.
16. **Statistics on Home.** Revenue by month and by client, top clients, average days to pay by client, overdue ageing (0-30, 31-60, 60+ days), GST collected this financial year (CGST/SGST/IGST split), and quotation to invoice conversion. Filters for financial year and client.
17. **Invoice list.** Search (number, client, project, amount), group by client, month or status (switch), saved filters, and a sticky total at the bottom.
18. **Auto-grouping clients.** Suggest groups from client data: same state, overseas, retainer (invoiced every month), wedding season. Show "We found 3 retainer clients. Make a group?" as a one-tap suggestion.
19. **Due date and reminder setup per invoice.** A due date picker with presets, and the reminder schedule shown and editable in the Amounts step (inherited from the group).

31. **More sign-in options (asked 2026-11-15).** Add "Continue with Google", "Continue with Apple" and email magic-link buttons to the login and sign-up screens, built with the provider kept behind one interface (`lib/authProviders.ts`) so Firebase Auth can be connected later. Until Firebase is set up, the buttons show a friendly "Coming soon, use email for now" message instead of failing. Server: accept a verified Firebase ID token at `/api/account/oauth` (verify with Google's public keys, never trust the client), and link it to an existing account by verified email. Use the official brand buttons and follow their usage rules.

## P3: onboarding, accounts, legal, polish
20. **Setup wizard, personalised.** Who are you: Business, Freelancer or individual, Agency, or Client only. Then what you do, how you charge (hourly, per day, per project, retainer), GST registered or not, clients in India or abroad, and how you want to send (email or WhatsApp). The answers set the invoice types, terms, currency, plan defaults, units and dashboard widgets.
21. **Guided tour.** Optional and skippable, with "Skip" and "Don't show again": coach marks on Create, Clients, Settings and the editor steps. Store the dismissal on the user.
22. **Sign-up and sign-in screens.** A faint, slowly moving layer of brand ring shapes in the background (transform and opacity only, respecting reduced motion), a split layout with a product preview on the side, and an account-type choice (Business, Individual or Client).
23. **Legal.** A Software licence and acceptable use page, a Cookie policy page and a cookie banner (essential only: we use one session cookie and a theme setting), and footer links everywhere. Keep "draft for legal review".
24. **Jakob's law.** Use familiar patterns: a left sidebar (done), ⌘K (done), a primary "New invoice" button at the top right of every Studio page, Gmail-style inbox rows in Slip, and standard icons.
25. **Create emphasis.** The Create item in the sidebar and tab bar gets the filled accent style. The type picker becomes large visual cards with a mini preview of each type.
26. **"What did you do" design.** Group the service chips by profession category, put "Add your own" inline as a chip, show selected chips as a summary sentence, and count-animate the line it builds.
27. **Space use.** Tighten paddings, use two columns on wide screens for Settings and the client form, put the dashboard on a 12-column grid, and avoid tall empty cards.
28. **Overscroll bounce.** Rubber-band effect at the ends of long lists and pages on desktop: a wrapper that translates the content by a damped overscroll amount from wheel events and springs back (motion). Off for reduced motion. Native bounce stays on iOS.
29. **Logo and email in Settings.** A printable letterhead preview (logo, name, contact) and an email template preview showing exactly what the client will receive.
30. **More dark designs:** covered by the colour sets in item 15.

## Server changes needed (summary)
- `businesses`: `automation` JSON, `phones` JSON list, `qr_image`, `default_theme`, `default_palette`, `default_terms` JSON, `terms_pdf`, `mail_from_name`, `reply_to`.
- `invoices.extra`: `job`, `phoneIds`, `qrMode`, `palette`, `layout`, `termsBlocks`, `annexBlocks`.
- Use `ensureColumn` migrations (additive), extend the zod schemas, and add a test for each.

## Definition of done (every item)
Type-check and lint are clean, `bun test` passes with new tests for new server behaviour, the production build passes, and screenshots at phone and desktop sizes in light and dark mode are checked. There are no console errors, and no native selects or date inputs remain.

## Added 2026-11-15 (after-reset list)
32. **Unsaved changes prompt.** Before leaving any form with edits (editor, Settings, client dialogs, type builder), show an in-app "Save changes?" dialog with Save, Discard and Cancel. Cover in-app navigation (React Router `useBlocker`), not just closing the tab. Pair with autosave of editor drafts every few seconds.
33. **Connect codes expire in 24 hours.** Business connect codes and invite links rotate automatically every 24 hours. Show the time left next to the QR and a "New code" button. The server stores the issue time, rejects expired codes, and issues a fresh code on demand.
34. **Splash and app choice.** On a first visit, show the loader, then the home page. On a return visit, show the loader, then an animated "Open Studio or Slip" chooser with two large cards and graphics: the ring turns into the Studio or Slip glyph. Remember the last choice and offer "Always open ..." with a way to undo it in Settings.
35. **FAQs.** A public FAQ page with common questions. Businesses can also add FAQs per client or per group (questions and answers shown in that client's Slip view, for example "How do I pay?" or "What is included?"). Manage them in the client dialog and in Settings, with templates to start from.
36. **Service catalogue with set rates.** In Settings, a list of services: name, description, unit, rate, GST rate, and optional default terms. The Scope step chips come from the catalogue; picking one adds a line with its rate and unit. Allow packages (bundles of services at one price). Search plus recent and favourite services.
37. **Client data sync and sharing control.** When a connected client adds or changes their logo or details in Slip, the business sees them automatically, with a quiet "Mehta Weddings updated their logo" notice. In Slip, the client controls what they share with one toggle: Essentials (name, company, GSTIN, billing address) or Everything. They can override this per business and per project.
38. **Several emails, phones and addresses.** Clients and businesses can hold several of each, with labels (Billing, Office, Site, Personal) and a default for each kind. Per invoice, choose which email gets the copy, which phone shows, and which address is billed. Suggest smartly: billing address for invoices, site address for event work. Saved addresses get an "Add address" flow with PIN-based city and state filled in.
39. **"What you do" in Settings.** A General section where the business lists what it does as tags in categories (for example Video: shoot, edit, grade, sound; Design: logo, brand book). Each project or invoice picks from these tags in the Scope step. The tags also drive term suggestions and statistics (revenue by service).
40. **Recents and history.** Recent invoices, clients and searches in the ⌘K palette and on Home. A version history for each invoice: every save and send, with a view of any earlier version and "Restore as new draft". This also covers the original tool's History.
41. **Undo and redo states.** Grey out and disable Undo and Redo when there is nothing to undo or redo (the buttons exist; their disabled style needs to be clearly visible), and show a tooltip with the shortcut.
42. **Calmer pages.** Regroup every dense screen (editor steps, Settings, client form, dashboard) into clear sections with short headings. Show the essentials first and put advanced options behind "More options" disclosures, with at most about seven controls visible per group. Use progressive disclosure throughout.

## Added 2026-11-15 (second after-reset list)
43. **Tighter privacy.** Check every route for ownership. Encrypt bank, PAN and phone fields at rest (AES-GCM with a key from env). Signed, expiring links for anything shared. Data export and delete-everything for users. Minimum data shared by default. Audit log visible to the user (sign-ins, sends). Security headers re-checked; CSP added.
44. **Step order.** Re-order the editor to: Client, then What you did (job, services, scope), then Lines and amounts, then Payment (plan, due date, reminders, bank and QR), then Terms and annexure, then Review and send. Each step only shows what belongs to it.
45. **Lines and amounts, rebuilt.** A table-like editor: inline rows (description, HSN/SAC, qty, unit, rate, discount per line, tax per line, amount). Add from the service catalogue, reorder by dragging, duplicate a row, and use keyboard shortcuts (Enter for a new row). Live subtotal, tax and total in a sticky summary. Clear empty and error states.
46. **INR only for now.** Remove the other currencies from the picker. Show "More currencies coming soon" (disabled). Leave the code ready to adjust tax, date format and places per country later.
47. **Real PDF download.** "Download PDF" produces a file that matches the on-screen design exactly, with no browser print dialog, headers or margins. Generate it on the server with a headless browser (Puppeteer rendering the same document component at A4), or on the client with a vector PDF library. Every page included (terms, annexure, uploaded terms PDF merged). The file is named after the invoice number.
48. **Record payment, richer.** The Record payment dialog supports advance, part payment, full payment, TDS deducted, write-off, discount given after sending, and refund, each with an optional note and reference. These show in a payment history on the invoice and update the balance and stamp correctly.
49. **More automatic terms and annexures.** A bigger clause library (by profession, payment plan, deliverables, usage rights, revisions, cancellation, confidentiality, force majeure, late fees, TDS, travel and expenses) and annexure templates (scope, timeline, deliverables list, exclusions, milestones). Plus a **liability notice**: before sending an invoice whose terms or annexure were generated automatically, show a one-time pop-up for that project: "These terms were suggested automatically. Please review them; you are responsible for them, Shakeslip is not." The user ticks to confirm. Store the confirmation with the invoice; ask once per project.
50. **Sorting.** Invoices and clients sortable by date (issued or due), name, amount, balance, status and last activity, ascending or descending. The choice is remembered and synced to the URL.
51. **Grid or list view.** Switch between list rows and a card grid (with mini invoice thumbnails) for invoices and clients. Remembered per page.
52. **Greeting splash for return visits.** On return, the loader transitions into a greeting by time of day (Good morning, Good afternoon, Good evening, Working late) with the user's first name and one useful fact ("2 invoices due this week"), then the home page. Short (under 2 s), skippable, and respects reduced motion. Combine with item 34.
53. **Close and leave protection.** When closing the tab or navigating away with unsaved or unsent work, prompt. For in-app navigation use our own dialog with "Save as draft", "Discard" and "Stay". For closing the tab, use the browser's leave warning (browsers only allow their own generic text there). Autosave the draft first so nothing is lost.
54. **Shake on missing fields.** When the user tries to go on or send with something missing, the missing fields shake gently (a horizontal transform spring, about 300 ms), get a red outline and message, and the page scrolls to the first one. The same markers show on the invoice preview. Reduced motion uses outline only.
55. **Design flow pass.** Review every screen for a consistent rhythm: one primary action per screen, consistent spacing scale, heading sizes and transitions between steps. No orphaned controls. Verify with screenshots at all sizes.
