import type { Slide } from "../types";
import { formById, withAccent, type BookTheme, type FormId } from "./forms";

/** One page in the engine's data format (see public/viewer.html, LAY.*). */
export type BookPage =
  | { type: "cover" }
  | { type: "section"; kicker: string; title: string }
  | { type: "points"; kicker: string; title: string; items: string[] }
  | { type: "rows"; kicker: string; title: string; rows: [string, string][] }
  | { type: "steps"; kicker: string; title: string; steps: [string, string][] }
  | { type: "stats"; kicker: string; title: string; cards: StatCard[]; note?: string }
  | { type: "table"; kicker: string; title: string; head: string[]; rows: string[][] }
  | { type: "quote"; kicker: string; title: string; quote: string; by?: string }
  | { type: "close"; title: string; lines: string[]; contact?: string }
  | { type: "image"; src: string; layer?: string; anim?: { x: number; y: number; w: number; h: number; dir: string; d: number }[] };

export interface StatCard { pre: string; v: number; dec: number; u: string; l: string; s: string; p: number }

export interface BookData {
  D: {
    theme: BookTheme;
    meta: { tag: string; t1: string; t2: string; sub: string; by: string; brand: string; mark: string };
    titles: string[];
    pages: BookPage[];
  };
  CFG: Record<string, unknown>;
  /** For each page, the index of the slide it came from (-1 for the automatic closing page). */
  pageSlide: number[];
}

export interface BookOptions {
  form: FormId;
  lang: "ko" | "en";
  by?: string;
  brandLine?: string;
  watermark?: string;
  logo?: string;
  accent?: string;
  orig?: string[];
  origText?: string;
  origFile?: string;
  contact?: string;
  videoSave?: boolean;
  chrome?: boolean;
  page?: number;
  /** Show these source page images as the book's pages instead of rebuilding them. */
  pageImages?: string[];
  pageTitles?: string[];
  /** Pages designed by Deck (Pagecraft builder design) and drawn as images: which slide each came from. */
  pageSlides?: number[];
  /** Chart pages: the data-mark layer and where to wipe it in, per page image. */
  pageLayers?: ({ layer?: string; anim?: { x: number; y: number; w: number; h: number; dir: string; d: number }[] } | undefined)[];
  /** Page-edge color of the 3D book (hex without #). */
  inner?: string;
}

const VIEWER_UI = {
  ko: {
    hint: "위로 쓸어 올리거나 ▶ 를 눌러 한 장씩 넘겨 보세요", toc: "목차", prev: "이전", next: "다음", big: "크게 보기",
    sound: "효과음", again: "처음으로", close: "닫기", video: "영상 보기", orig: "원문 보기", origFile: "원본 파일 열기", qr: "휴대폰으로 열기", qrNote: "카메라로 스캔하면 같은 책자가 휴대폰에서 열립니다.", hintDrag: "끌어서 책을 돌려 보고, 클릭이나 ▶ 로 한 장씩 넘겨 보세요",
    videoTitle: "요약 영상", replay: "다시 보기", saveVideo: "영상 저장", bookLabel: "가로 3D 책", bar: "책 조작",
  },
  en: {
    hint: "Swipe up or press ▶ to turn the page", toc: "Contents", prev: "Previous", next: "Next", big: "Enlarge",
    sound: "Sound", again: "Back to start", close: "Close", video: "Watch video", orig: "Original", origFile: "Open original file", qr: "Open on your phone", qrNote: "Scan with your camera to open this book on your phone.", hintDrag: "Drag to turn the book, click or press ▶ to turn the page",
    videoTitle: "Summary video", replay: "Replay", saveVideo: "Save video", bookLabel: "Landscape 3D book", bar: "Book controls",
  },
};

/** The book speaks the document's language, whatever the app's UI language is. */
export function docLang(text: string): "ko" | "en" {
  const hangul = (text.match(/[가-힣]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return hangul * 2 > latin * 0.5 ? "ko" : "en";
}

/** "Title: subtitle" or a long title becomes two cover lines. */
export function splitTitle(title: string): [string, string] {
  const t = title.trim();
  const m = /^(.{3,60}?)\s*[:：–—|]\s+(.+)$/.exec(t);
  if (m) return [m[1], m[2]];
  // The cover sets each line at 70px in a 900px column: anything wider goes on two lines, as on the Pagecraft sample.
  const em = [...t].reduce((w, c) => w + (/[ᄀ-ᇿ　-鿿가-힯]/.test(c) ? 1 : 0.56), 0);
  if (em * 70 <= 900) return [t, ""];
  const mid = Math.floor(t.length / 2);
  let at = -1;
  for (let d = 0; d < mid; d++) {
    if (t[mid + d] === " ") { at = mid + d; break; }
    if (t[mid - d] === " ") { at = mid - d; break; }
  }
  return at > 0 ? [t.slice(0, at), t.slice(at + 1)] : [t, ""];
}

/** The source as a reader sees it in "Original": no Markdown marks, bullets as dots, tables as aligned columns. */
export function plainText(md: string): string {
  return md
    .split("\n")
    .filter((l) => !/^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-*:?\s*$/.test(l)) // table rule lines
    .map((l) =>
      l
        .replace(/^#{1,6}\s+/, "")
        .replace(/^\s*[-*+]\s+(?=\d+[.)]\s)/, "")
        .replace(/^\s*[-*+]\s+/, "• ")
        .replace(/^\s*\|(.*)\|\s*$/, (_, row: string) => row.split("|").map((c) => c.trim()).join("    "))
        .replace(/\*\*(.+?)\*\*/g, "$1"),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** "“Great.” — Dana" → { quote: "Great.", by: "Dana" }; the page draws its own opening quote mark. */
export function splitQuote(text: string): { quote: string; by?: string } {
  const m = /^["“](.+)["”]\s*(?:[—–-]\s*(.+))?$/.exec(text.trim());
  return m ? { quote: m[1].trim(), by: m[2]?.trim() || undefined } : { quote: text };
}

const THANKS_RE = /^(?:thank you|thanks|감사합니다|q\s*&\s*a|questions)[.!?]*$/i;
const CONTACT_RE = /^(?:contact|email|e-mail|문의|연락처)\s*[:：]\s*(.+)$/i;
function findContact(slides: Slide[]): string | undefined {
  for (const s of slides) for (const b of s.bullets ?? []) {
    const m = CONTACT_RE.exec(b.trim());
    if (m) return m[1];
  }
  return undefined;
}

/** "$4.2M" → { pre:"$", v:4.2, dec:1, u:"M" }; "1,240" → { v:1240 }. */
export function parseValue(value: string): { pre: string; v: number; dec: number; u: string } {
  const m = /^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/.exec(value.trim());
  if (!m) return { pre: "", v: 0, dec: 0, u: value };
  const num = m[2].replace(/,/g, "");
  const dec = num.includes(".") ? num.split(".")[1].length : 0;
  return { pre: m[1], v: parseFloat(num), dec, u: m[3] };
}

const LABELED = /^(.{2,18}?)\s*[:：–—]\s+(.{2,})$/;
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export function toBook(slides: Slide[], opts: BookOptions): BookData {
  const form = formById(opts.form);
  const theme = withAccent(form.theme, opts.accent);
  const pages: BookPage[] = [];
  const titles: string[] = [];
  const pageSlide: number[] = [];
  const cover = slides.find((s) => s.layout === "title") ?? slides[0];
  const deckTitle = cover?.title ?? "";
  const [t1, t2] = splitTitle(deckTitle);
  let section = form.tag;

  // A divider page only earns its place in front of a long section; short sections just label their pages.
  const sectionSize = slides.map((s, i) => {
    if (s.layout !== "section") return 0;
    let n = 0;
    for (let j = i + 1; j < slides.length && slides[j].layout !== "section"; j++) n++;
    return n;
  });

  const add =(p: BookPage, title: string, si: number) => {
    pages.push(p);
    titles.push(title);
    pageSlide.push(si);
  };

  if (opts.pageImages?.length) {
    // Original-pages mode: the source slides, bound into the book as they are (pageSlide -2 = not editable).
    opts.pageImages.forEach((src, i) => add({ type: "image", src, ...(opts.pageLayers?.[i]?.layer ? opts.pageLayers[i] : {}) }, opts.pageTitles?.[i] || `${i + 1}`, opts.pageSlides?.[i] ?? -2));
  } else slides.forEach((s, si) => {
    // The deck's own "Thank you" slide gives way to the book's closing page (its contact line still goes there).
    if (si > 0 && si === slides.length - 1 && THANKS_RE.test(s.title.trim())) return;
    // The small label over a title names the section; when it would only repeat the title, it names the document type.
    // With no section of its own the page shows just its number.
    const kicker = section === form.tag || section.trim().toLowerCase() === s.title.trim().toLowerCase() ? "" : section;
    const items = (s.bullets ?? []).map((b) => b.trim()).filter(Boolean);
    switch (s.layout) {
      case "title":
        add({ type: "cover" }, opts.lang === "ko" ? "표지" : "Cover", si);
        break;
      case "section":
        section = s.title;
        if (sectionSize[si] >= 3) add({ type: "section", kicker: s.kicker ?? "", title: s.title }, s.title, si);
        break;
      case "stats": {
        const vals = (s.stats ?? []).filter((x) => x.value).slice(0, 4).map((x) => ({ x, v: parseValue(x.value) }));
        // Bars only when every card is a share out of 100%; a lone bar among plain numbers reads as decoration.
        const allPct = vals.every(({ v }) => /%/.test(v.u));
        const cards = vals.map(({ x, v }) => ({ ...v, l: x.label, s: "", p: allPct ? Math.min(100, Math.abs(v.v)) : -1 }));
        add({ type: "stats", kicker, title: s.title, cards }, s.title, si);
        break;
      }
      case "table": {
        const [head = [], ...rows] = s.table ?? [];
        const parts = chunk(rows, 4);
        (parts.length ? parts : [[]]).forEach((p, n) =>
          add({ type: "table", kicker, title: n ? `${s.title} (${n + 1})` : s.title, head, rows: p }, s.title, si),
        );
        break;
      }
      case "quote":
        add({ type: "quote", kicker, title: s.title, ...splitQuote(s.quote ?? "") }, s.title, si);
        break;
      default: {
        if (!items.length) {
          add({ type: "points", kicker, title: s.title, items: [] }, s.title, si);
          break;
        }
        const labeled = items.map((i) => LABELED.exec(i));
        if (s.ordered && items.length >= 2 && items.length <= 4 && items.every((i) => i.length <= 90)) {
          const steps = items.map((i, n): [string, string] => (labeled[n] ? [labeled[n]![1], labeled[n]![2]] : [i, ""]));
          add({ type: "steps", kicker, title: s.title, steps }, s.title, si);
        } else if (items.length <= 5 && labeled.every(Boolean)) {
          add({ type: "rows", kicker, title: s.title, rows: labeled.map((m) => [m![1], m![2]]) }, s.title, si);
        } else {
          chunk(items, 5).forEach((p, n) =>
            add({ type: "points", kicker, title: n ? `${s.title} (${n + 1})` : s.title, items: p }, s.title, si),
          );
        }
      }
    }
  });

  const closeTitle = opts.lang === "ko" ? "감사합니다" : "Thank you";
  // A "Contact: …" line in the deck goes on the closing page when none was typed in.
  const contact = opts.contact || findContact(slides);
  if (!opts.pageImages?.length || (opts.contact && !opts.pageSlides)) {
    add({ type: "close", title: closeTitle, lines: [deckTitle, opts.by ?? ""].filter(Boolean), contact }, closeTitle, -1);
  }

  // Video scenes: the book's own pages, played with their entrance animations.
  // The cover opens it, then up to 6 content pages (section dividers left out), then the closing page.
  const content = pages.map((p, i) => ({ p, i })).filter(({ p, i }) => i > 0 && p.type !== "section" && p.type !== "close");
  const last = pages.length - 1;
  const scenes = [
    { i: 0, t: titles[0] ?? "" },
    ...content.slice(0, 6).map(({ i }) => ({ i, t: titles[i] })),
    ...(last > 0 && (pages[last].type === "close" || opts.pageSlides) && !content.slice(0, 6).some((x) => x.i === last) ? [{ i: last, t: titles[last] }] : []),
  ];

  const date = new Date();
  const by = opts.by ?? date.toLocaleDateString(opts.lang === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "long" });

  return {
    D: {
      theme,
      meta: {
        tag: form.tag, t1, t2,
        sub: cover?.subtitle ?? "",
        by,
        brand: deckTitle,
        mark: opts.watermark ?? opts.brandLine ?? "",
      },
      titles,
      pages,
    },
    CFG: {
      lang: opts.lang,
      ui: VIEWER_UI[opts.lang],
      brandLine: opts.brandLine ?? "",
      watermark: opts.watermark,
      logo: opts.logo,
      orig: opts.orig,
      origText: opts.orig?.length || !opts.origText ? undefined : plainText(opts.origText),
      origFile: opts.origFile,
      scenes,
      videoSave: opts.videoSave,
      chrome: opts.chrome,
      inner: opts.inner,
      page: opts.page,
    },
    pageSlide,
  };
}
