Local UX checks (development services must be running on 5173 and 8787):

    python3 test/make-docx.py
    node test/ux-review.mjs
    node test/pdf-review.mjs

The browser check uses puppeteer-core from server/node_modules and Brave at its default macOS path. It logs into the local demo account, creates a writing template, verifies it and removes that template. The PDF check creates and soft-deletes its own draft without sending it. Browser-local draft storage is isolated to the temporary browser profile. Screenshots, Word fixture and PDF output go to /tmp/shakeslip-ux-review, outside the repository. Never run against production.

Server regression checks: run `bun test` in server/. These use an in-memory database. Run `bun x tsc --noEmit` there and `bun run build` in web/ for type/build validation.
