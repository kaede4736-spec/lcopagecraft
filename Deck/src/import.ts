import { htmlToMarkdown } from "./engine/parse";

export interface Imported {
  text: string;
  /** Original pages as JPEG data URLs (PDF only). */
  orig?: string[];
  /** Page titles found in the file, for the contents list. */
  titles?: string[];
  /** Slide decks keep their original pages in the book by default. */
  kind: "slides" | "doc";
  name: string;
  /** The largest photo in the file (PPTX, DOCX), for the cover. */
  photo?: string;
}

const MAX_PAGES = 40;

export class ImportError extends Error {}

export async function importFile(f: File): Promise<Imported> {
  const ext = f.name.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return importPdf(f);
  if (ext === "pptx") return { text: await pptxToMarkdown(f), name: f.name, kind: "slides", photo: await largestPhoto(f, "ppt/media/") };
  if (ext === "docx") {
    const mammoth = await import("mammoth/mammoth.browser");
    const res = await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() });
    return { text: htmlToMarkdown(res.value), name: f.name, kind: "doc", photo: await largestPhoto(f, "word/media/") };
  }
  if (ext === "ppt" || ext === "doc" || ext === "key" || ext === "hwp") {
    throw new ImportError("old-format");
  }
  return { text: await f.text(), name: f.name, kind: "doc" };
}

interface Line {
  y: number;
  h: number;
  s: string;
  /** Letter-spaced brand mark or kicker. */
  spaced?: boolean;
  /** Had glyphs with no text behind them (usually digits in a subset font), so its words are incomplete. */
  broken?: boolean;
}

const KICKER = /^[\d\s.]*[A-Z][A-Z\s&/-]{2,16}$/; // "01 PROBLEM", "SUMMARY"
/** PDF text runs come back split: "52 명", "( 가상 )", "입니다 ." */
/** pdf.js returns glyphs the PDF gives no text for as private use characters. */
const ICON_GLYPHS = new RegExp("[\\uE000-\\uF8FF]", "g");
const HAS_ICON_GLYPH = new RegExp("[\\uE000-\\uF8FF]");
export const tidy = (s: string) =>
  s
    .replace(ICON_GLYPHS, " ")
    .replace(/\s+/g, " ")
    .replace(/(\d)\s+(?=[가-힣%])/g, "$1")
    .replace(/([([{“"])\s+/g, "$1")
    .replace(/\s+([)\]}”".,!?;:%])/g, "$1")
    .trim();
/** Letter-spaced labels ("N O R T H L I N E") are brand marks and kickers, not titles. */
const SPACED = /(?:^|\s)(?:[\p{L}\p{N}] ){3,}[\p{L}\p{N}](?:\s|$)/u;
export const unspace = (s: string) =>
  s.replace(/(?<=^|\s)(?:[\p{L}\p{N}] ){2,}[\p{L}\p{N}](?=\s|$)/gu, (m) => m.replace(/ /g, ""));
export interface Run { x: number; w: number; s: string; h: number }
/**
 * Joins the text pieces of one line. PDFs often split a word into several pieces (kerning, one piece
 * per character), so a space goes in only where the page leaves a gap between two pieces.
 */
export const joinRuns = (runs: Run[]) =>
  runs.reduce((out, q, i) => {
    if (!i) return q.s;
    const prev = runs[i - 1];
    const gap = q.x - (prev.x + prev.w);
    return out + (gap > Math.min(prev.h, q.h) * 0.15 ? " " : "") + q.s;
  }, "");
const norm = (s: string) => s.replace(/\d+/g, "#").replace(/\s+/g, " ").trim();

/* ---------- PDF: text for the book, page images for "Original" ---------- */

async function importPdf(f: File): Promise<Imported> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
  const n = Math.min(pdf.numPages, MAX_PAGES);
  const md: string[] = [];
  const orig: string[] = [];
  const titles: string[] = [];
  const pagesLines: { lines: Line[]; height: number; landscape: boolean }[] = [];

  // intent "print" renders in one pass; the default display intent paces itself with animation
  // frames (~2 s a page, and it stalls in background tabs).
  const readPage = async (p: number) => {
    const page = await pdf.getPage(p);
    const vp1 = page.getViewport({ scale: 1 });

    // Page image for the book and the "Original" view.
    const vp = page.getViewport({ scale: 1600 / vp1.width });
    const c = document.createElement("canvas");
    c.width = Math.round(vp.width);
    c.height = Math.round(vp.height);
    await page.render({ canvasContext: c.getContext("2d")!, viewport: vp, intent: "print" }).promise;
    const image = c.toDataURL("image/jpeg", 0.84);

    // Text, grouped into lines by baseline.
    const tc = await page.getTextContent();
    const rows = new Map<number, Run[]>();
    for (const it of tc.items as { str: string; transform: number[]; height: number; width: number }[]) {
      if (!it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3) * 3;
      const h = Math.abs(it.transform[3]) || it.height;
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x: it.transform[4], w: it.width, s: it.str, h });
    }
    const lines = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([y, parts]) => {
        // Bullet glyphs are drawn marks, not words.
        const joined = joinRuns(parts.sort((a, b) => a.x - b.x));
        const raw = tidy(joined).replace(/^(?:[•▪◦‣●■]\s*|[-–]\s+)/, "");
        return { y, h: Math.max(...parts.map((q) => q.h)), s: unspace(raw), spaced: SPACED.test(raw), broken: HAS_ICON_GLYPH.test(joined) };
      })
      .filter((l) => l.s && !/^\d{1,3}$/.test(l.s)); // drop page numbers
    return { image, lines, height: vp1.height, landscape: vp1.width > vp1.height };
  };
  for (let p = 1; p <= n; p += 6) {
    const batch = await Promise.all(Array.from({ length: Math.min(6, n - p + 1) }, (_, k) => readPage(p + k)));
    for (const b of batch) {
      orig.push(b.image);
      pagesLines.push({ lines: b.lines, height: b.height, landscape: b.landscape });
    }
  }

  // Headers and footers repeat on most pages; they are not content.
  const seen = new Map<string, number>();
  pagesLines.forEach(({ lines }) => new Set(lines.map((l) => norm(l.s))).forEach((k) => seen.set(k, (seen.get(k) ?? 0) + 1)));
  const repeated = (s: string) => pagesLines.length >= 3 && (seen.get(norm(s)) ?? 0) >= Math.max(3, pagesLines.length * 0.5);
  const slides = pagesLines.filter((x) => x.landscape).length > pagesLines.length / 2;

  pagesLines.forEach(({ lines: all, height, landscape }, idx) => {
    const p = idx + 1;
    const lines = all.filter((l) => !repeated(l.s));
    if (!lines.length) {
      titles.push(`${p}`);
      return;
    }
    const maxH = Math.max(...lines.map((l) => l.h));
    if (landscape) {
      // Slide: the title is the largest line in the top third (big numbers further down are not titles).
      // A cover's title can sit anywhere on the page.
      const words = (l: Line) => !l.spaced && !KICKER.test(l.s) && /[\p{L}\p{N}].*[\p{L}\p{N}]/u.test(l.s);
      const top = lines.filter((l) => (p === 1 || l.y > height * 0.62) && words(l));
      const whole = top.filter((l) => !l.broken);
      const pool = whole.length ? whole : top.length ? top : lines;
      const tH = Math.max(...pool.map((l) => l.h));
      const title = pool.find((l) => l.h === tH)!;
      titles.push(title.s);
      // Body size is measured without the title, or a slide with one line under its title loses that line.
      const rest = lines.filter((l) => l !== title).map((l) => l.h).sort((a, b) => a - b);
      const bodyH = rest.length ? rest[Math.floor(rest.length / 2)] : tH;
      const body = lines
        .filter((l) => l !== title && !l.spaced && !l.broken && !KICKER.test(l.s) && l.h >= bodyH * 0.8 && l.s.length >= 4)
        .slice(0, 5);
      md.push(`${p === 1 ? "#" : "##"} ${title.s}`, "");
      body.forEach((l) => md.push(p === 1 ? l.s : `- ${l.s}`));
      md.push("");
    } else {
      const bodyH = lines.map((l) => l.h).sort((a, b) => a - b)[Math.floor(lines.length / 2)];
      titles.push((lines.find((l) => l.h === maxH && !l.broken) ?? lines.find((l) => l.h === maxH) ?? lines[0]).s);
      // Document page: larger lines are headings, the rest join into paragraphs.
      let para: string[] = [];
      const flush = () => { if (para.length) md.push(para.join(" "), ""); para = []; };
      lines.forEach((l, i) => {
        if (l.broken) return;
        if (l.h >= bodyH * 1.25 && l.s.length < 80) {
          flush();
          md.push(`${p === 1 && i === 0 ? "#" : "##"} ${l.s}`, "");
        } else {
          para.push(l.s);
          if (/[.!?。다]$/.test(l.s)) flush();
        }
      });
      flush();
    }
  });
  if (!md.join("").trim() && !slides) throw new ImportError("no-text");
  return { text: md.join("\n"), orig, titles, kind: slides ? "slides" : "doc", name: f.name };
}

/* ---------- Cover photo: the largest JPEG/PNG inside an Office file ---------- */

async function largestPhoto(f: File, dir: string): Promise<string | undefined> {
  try {
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(await f.arrayBuffer());
    const pics = Object.values(zip.files).filter((z) => z.name.startsWith(dir) && /\.(jpe?g|png)$/i.test(z.name));
    let best: { b: Uint8Array; name: string } | null = null;
    for (const z of pics) {
      const b = await z.async("uint8array");
      if (b.length > 40_000 && (!best || b.length > best.b.length)) best = { b, name: z.name };
    }
    if (!best) return undefined;
    // Shrink to cover size so the page image stays light.
    const bmp = await createImageBitmap(new Blob([best.b]));
    if (bmp.width < 500 || bmp.height < 400) return undefined; // icons and logos are not cover photos
    const k = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.84);
  } catch {
    return undefined;
  }
}

/* ---------- PPTX: slide titles, text and tables (images need a PDF) ---------- */

async function pptxToMarkdown(f: File): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await f.arrayBuffer());
  const files = Object.keys(zip.files)
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    .sort((a, b) => +a.match(/\d+/g)!.pop()! - +b.match(/\d+/g)!.pop()!);
  const out: string[] = [];
  const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const PNS = "http://schemas.openxmlformats.org/presentationml/2006/main";

  for (const [i, path] of files.slice(0, MAX_PAGES).entries()) {
    const doc = new DOMParser().parseFromString(await zip.file(path)!.async("string"), "application/xml");
    let title = "";
    const body: string[] = [];
    for (const sp of Array.from(doc.getElementsByTagNameNS(PNS, "sp"))) {
      const ph = sp.getElementsByTagNameNS(PNS, "ph")[0];
      const type = ph?.getAttribute("type") ?? "";
      const paras = Array.from(sp.getElementsByTagNameNS(A, "p"))
        .map((p) => Array.from(p.getElementsByTagNameNS(A, "t")).map((t) => t.textContent ?? "").join("").trim())
        .filter(Boolean);
      if (!paras.length) continue;
      if ((type === "title" || type === "ctrTitle") && !title) title = paras.join(" ");
      else body.push(...paras);
    }
    for (const tbl of Array.from(doc.getElementsByTagNameNS(A, "tbl"))) {
      const rows = Array.from(tbl.getElementsByTagNameNS(A, "tr")).map((tr) =>
        Array.from(tr.getElementsByTagNameNS(A, "tc")).map((tc) => (tc.textContent ?? "").replace(/\|/g, "/").trim()),
      );
      if (rows.length) {
        body.push("");
        rows.forEach((r, n) => {
          body.push(`| ${r.join(" | ")} |`);
          if (n === 0) body.push(`|${r.map(() => " --- ").join("|")}|`);
        });
        body.push("");
      }
    }
    if (!title && body.length) title = body.shift()!;
    if (!title) continue;
    out.push(`${i === 0 ? "#" : "##"} ${title}`, "");
    body.forEach((b) => out.push(i === 0 || !b || b.startsWith("|") ? b : `- ${b}`));
    out.push("");
  }
  if (!out.join("").trim()) throw new ImportError("no-text");
  return out.join("\n");
}
