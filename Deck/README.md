# Deck (beta)

Turns a PPT, PDF, Word file or pasted text into a landscape 3D book: a spring-bound book on a desk, turned page by page, with a summary video and the original pages one tap away. Runs separately from LCO Pagecraft (the done-for-you service), and uses Pagecraft's own book engine.

Everything runs in the browser, so making a book costs nothing on the server.

## Run

```bash
npm install
npm run dev      # http://localhost:5180
npm test         # unit tests
npm run build    # static site in dist/ (includes viewer.html)
```

## How it fits together

| Part | File | What it does |
| --- | --- | --- |
| Book engine | `public/viewer.html` | The Pagecraft landscape 3D book (three.js r128): spring binding, desk, page-turn sound, contents, enlarge, 영상 보기, 원문 보기. Loads any deck's data. |
| Import | `src/import.ts` | PDF (text + page images), PPTX (text and tables), DOCX, MD, TXT |
| Structure | `src/engine/` | Text → title, sections, points, numbers, tables, quotes |
| Book data | `src/book/toBook.ts` | Slides → the engine's page types (cover, points, rows, steps, stats, table, quote, close, image) |
| Palettes | `src/book/forms.ts` | Report, proposal, marketing, planning (Pagecraft's form palettes) |
| Exports | `src/exportBook.ts` | PNG zip, PDF, and the 3D book as one HTML file |

**Slide decks** (landscape PDFs) go into the book as their original slides by default. "Rebuild" turns their text into animated pages instead. Documents and text are always rebuilt.

## Fiverr showcase

`showcase/LCO_PageCraft_Showcase.html` is the Fiverr sample page (one self-contained file, about 2.4 MB): the MONOGRAM business report and the Halden Studio lookbook, with 3D flipbook, slide view, fullscreen, zoom, auto-play and QR.

Fiverr does not allow outside contact or payment details, so this file must never contain Kmong, prices, email addresses, Order/Contact text or outside links (only font and QR library URLs). Check it again after every edit. Upload the HTML file itself to Fiverr.

## Plans (pricing doc, 2026-11-15)

Defined in `src/config.ts`. During the beta, testers pick a plan in the top bar. There is no billing yet, and usage is counted per browser.

| Plan | Price | Books | Export | Other |
| --- | --- | --- | --- | --- |
| Free | $0 | 3 / month | PNG | Report and proposal forms (assumed), "Made with Deck" on the last page |
| Starter | $10/mo, $96/yr | 30 / month | PNG, PDF | All 4 forms |
| Pro | $20/mo, $180/yr | Unlimited | PNG, PDF, 3D book file | Brand color and logo, save the summary video (WebM) |
| Deck Pass | $12 once | 5 in 7 days | Same as Pro | |

## Not built yet

1. Hosting for the global test (static host for `dist/`)
2. Accounts and Paddle billing, with limits enforced on a server
3. Hosted share links, then QR and AR on top of them (the Pagecraft 3D book skill has both)
4. AI sentence polish (Pro)
5. PPTX slide images: a PPTX gives its text only; for original slides, upload the PDF
6. Product name (`BRAND` in `src/config.ts`)
