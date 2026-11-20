import type { Block, Slide, Stat } from "../types";

const MAX_BULLETS = 5;
const MAX_BULLET_CHARS = 140;
const MAX_TABLE_ROWS = 7; // header + 6
const MAX_TABLE_COLS = 5;

let counter = 0;
export const newId = () => `s${Date.now().toString(36)}${(counter++).toString(36)}`;

export function firstSentence(text: string): string {
  const m = /^(.+?[.!?。])(\s|$)/.exec(text);
  return (m ? m[1] : text).trim();
}

/** The paragraph's point: its first sentence, plus the next one when the first is too short to stand alone. */
export function keyPoint(text: string): string {
  const first = firstSentence(text);
  if (first.length >= 60 || first.length === text.trim().length) return shorten(first);
  const second = firstSentence(text.trim().slice(first.length).trim());
  return shorten(second ? `${first} ${second}` : first);
}

export function shorten(text: string, max = MAX_BULLET_CHARS): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf(","));
  return `${cut.slice(0, at > max * 0.6 ? at : max).replace(/[,\s]+$/, "")}…`;
}

const STAT_RE =
  /([$€£¥₩]\s?\d[\d,]*(?:\.\d+)?\s?(?:[kKmMbB]n?|million|billion|만|억|조)?|\d[\d,]*(?:\.\d+)?\s?(?:%|x|×|배|pp|%p|[kKmMbB]\b|million|billion|만\s?원|억\s?원|조\s?원|억|만|원|명|개|건|곳|시간|times|hours?|hrs|days|weeks|minutes|mins|km|kg|tonnes)|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{3,}(?:\.\d+)?)/;

/** Finds a headline number in a sentence: "$4.2M", "38%", "3x", "1,200명". */
export function extractStat(text: string): Stat | null {
  const m = STAT_RE.exec(text);
  if (!m) return null;
  const value = m[1].replace(/\s+/g, " ").trim();
  if (/^(19|20)\d{2}$/.test(value)) return null; // a year, not a metric
  // Durations and distances are metrics only when they lead ("26 hours to repair") or follow a label ("Turnaround: 26 hours");
  // "bikes for trips under 3 km" is a sentence, not a number to show big.
  const before = text.slice(0, m.index).trim();
  if (/(?:hours?|hrs|days|weeks|minutes|mins|km|kg|tonnes|시간)$/.test(value) && before && !/[:：]$/.test(before)) return null;
  let label = text.replace(m[0], " ").replace(/\s+/g, " ").replace(/\s+([,.;:])/g, "$1").replace(/^[\s,:–-]+|[\s,:–-]+$/g, "");
  label = shorten(firstSentence(label), 70);
  if (label.length < 3) return null;
  return { value, label };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface Section {
  title: string;
  groups: { title?: string; blocks: Block[] }[];
}

function toSections(blocks: Block[]): { title: string; subtitle?: string; sections: Section[] } {
  let title = "";
  let subtitle: string | undefined;
  let rest = blocks;

  const h1s = blocks.filter((b) => b.type === "heading" && b.level === 1);
  // A single H1 is the deck title. Several H1s are sections.
  if (h1s.length <= 1) {
    const idx = blocks.findIndex((b) => b.type === "heading");
    if (idx === 0 || (idx > 0 && h1s.length === 1)) {
      title = (blocks[idx] as { text: string }).text;
      rest = [...blocks.slice(0, idx), ...blocks.slice(idx + 1)];
    }
  }
  if (!title) {
    const first = blocks.find((b) => b.type === "para" || b.type === "heading");
    title = first ? shorten(firstSentence((first as { text: string }).text), 80) : "Untitled deck";
    // A title line set in body style (Word's "Title") is the cover, not the first point.
    if (first?.type === "para" && first.text.length <= 100) rest = rest.filter((b) => b !== first);
  }
  const lead = rest[0];
  if (lead && lead.type === "para") {
    subtitle = shorten(firstSentence(lead.text), 120);
    rest = rest.slice(1);
  }

  const sectionLevel: 1 | 2 = h1s.length > 1 ? 1 : 2;
  const sections: Section[] = [];
  let cur: Section | null = null;
  for (const b of rest) {
    if (b.type === "heading" && b.level <= sectionLevel) {
      cur = { title: b.text, groups: [{ blocks: [] }] };
      sections.push(cur);
      continue;
    }
    if (!cur) {
      cur = { title: "", groups: [{ blocks: [] }] };
      sections.push(cur);
    }
    if (b.type === "heading") {
      cur.groups.push({ title: b.text, blocks: [] });
    } else {
      cur.groups[cur.groups.length - 1].blocks.push(b);
    }
  }
  for (const s of sections) s.groups = s.groups.filter((g) => g.blocks.length || g.title);
  return { title, subtitle, sections: sections.filter((s) => s.title || s.groups.length) };
}

function groupToSlides(heading: string, blocks: Block[]): Slide[] {
  const slides: Slide[] = [];
  let points: string[] = [];
  let ordered = true;

  const flushPoints = () => {
    if (!points.length) return;
    const wasOrdered = ordered;
    ordered = true;
    const stats = points.map(extractStat).filter((s): s is Stat => !!s);
    // Short, mostly-numeric groups of 2–4 points read best as big numbers.
    // A point that needed two sentences is an argument, not a metric.
    const singleSentence = points.every((p) => !/[.!?。]\s+\S/.test(p));
    // Every point must carry a number, or the ones without would be dropped from the page.
    if (stats.length >= 2 && stats.length <= 4 && stats.length === points.length && singleSentence) {
      slides.push({ id: newId(), layout: "stats", title: heading, stats });
    } else {
      const parts = chunk(points, MAX_BULLETS);
      parts.forEach((p, n) =>
        slides.push({
          id: newId(),
          layout: "bullets",
          title: parts.length > 1 && n > 0 ? `${heading} (${n + 1})` : heading,
          bullets: p,
          ordered: wasOrdered || undefined,
        }),
      );
    }
    points = [];
  };

  const onlyPara = blocks.length === 1 && blocks[0].type === "para";
  for (const b of blocks) {
    if (b.type === "para") {
      // A paragraph alone on its page keeps every sentence as a point; otherwise each paragraph is one point.
      const sentences = b.text.split(/(?<=[.!?。])\s+/).filter(Boolean);
      if (onlyPara && sentences.length > 1 && sentences.length <= 4) points.push(...sentences.map((x) => shorten(x)));
      else points.push(keyPoint(b.text));
      ordered = false;
    } else if (b.type === "list") {
      points.push(...b.items.map((i) => shorten(i)));
      ordered = ordered && b.ordered;
    }
    else if (b.type === "quote") {
      flushPoints();
      slides.push({ id: newId(), layout: "quote", title: heading, quote: shorten(b.text, 220) });
    } else if (b.type === "table") {
      flushPoints();
      const rows = b.rows.map((r) => r.slice(0, MAX_TABLE_COLS));
      const [head, ...body] = rows;
      const parts = chunk(body, MAX_TABLE_ROWS - 1);
      (parts.length ? parts : [[]]).forEach((p, n) =>
        slides.push({
          id: newId(),
          layout: "table",
          title: n > 0 ? `${heading} (${n + 1})` : heading,
          table: [head, ...p],
        }),
      );
    }
  }
  flushPoints();
  return slides;
}

/** Builds a slide deck from parsed blocks. Pure and deterministic apart from ids. */
export function buildSlides(blocks: Block[]): Slide[] {
  const { title, subtitle, sections } = toSections(blocks);
  const slides: Slide[] = [{ id: newId(), layout: "title", title, subtitle }];
  const numbered = sections.filter((s) => s.title).length > 1;

  sections.forEach((s, n) => {
    if (numbered && s.title) {
      slides.push({
        id: newId(),
        layout: "section",
        kicker: String(n + 1).padStart(2, "0"),
        title: s.title,
      });
    }
    for (const g of s.groups) {
      const heading = g.title ?? s.title ?? title;
      const made = groupToSlides(heading || title, g.blocks);
      slides.push(...made);
    }
  });

  // No automatic "Key takeaways" page: it only repeated earlier lines. The book adds its own closing page.
  return slides;
}
