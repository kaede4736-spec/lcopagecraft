// Deck slides -> Pagecraft builder pages, following the builder's rules for documents (lib/docx_auto.py):
// title -> cover, numbers -> number cards, table -> table, short list -> points, numbered list -> steps,
// a quote -> quote page, plain text -> summary, contact lines -> the closing page.

import type { Slide } from "../types";
import type { Chart } from "./charts";
import type { DocInfo, Kpi, PageSpec, SideTable } from "./pages";

export interface Designed {
  doc: DocInfo;
  pages: PageSpec[];
  /** Contents-list name per page. */
  titles: string[];
  /** Which slide each page came from (-1: added by Deck, e.g. the closing page). */
  pageSlide: number[];
}

export interface DesignOptions {
  lang: "ko" | "en";
  /** Document type shown on the cover ("Business report"). */
  kind: string;
  photo?: string;
  logo?: string;
  contact?: string;
  notice?: string;
  date?: string;
}

const THANKS = /^(?:thank you|thanks|감사합니다|q\s*&\s*a|questions)[.!?]*$/i;
const CONTACT = /(@|\b0\d{1,2}-\d{3,4}-\d{4}\b|www\.|https?:\/\/|^\s*(?:contact|email|e-mail|문의|연락처)\s*[:：])/i;
const LABELED = /^(.{2,28}?)\s*[:：–—]\s+(.{2,})$/;
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/** "$1.2M" stays whole; a word unit ("26 hours", "52명") goes small after the number, as on the samples. */
export function splitValue(v: string): { value: string; unit: string } {
  const m = /^([^\d\-−+]*[\-−+]?[\d][\d,.]*)\s*(.*)$/.exec(v.trim());
  if (!m) return { value: v, unit: "" };
  const unit = m[2].trim();
  if (!unit) return { value: m[1], unit: "" };
  if (/^[%xX×]$|^[KMBkmb]$|^[KMB]?[+]?$/.test(unit)) return { value: m[1] + unit, unit: "" };
  return { value: m[1], unit };
}

/** A table cell as a number: "$2.3M" -> 2.3 ($M), "21,000" -> 21000, "48%" -> 48 (%), "$39/mo" -> 39 ($/mo). */
export function cellNumber(s: string): { v: number; unit: string } | null {
  const m = /^\s*([$€£¥₩]?)\s*([\-−+]?\d[\d,]*(?:\.\d+)?)\s*([%KMBkmb]|[A-Za-z가-힣/]{1,6})?\s*$/.exec(s ?? "");
  if (!m) return null;
  const v = parseFloat(m[2].replace(/,/g, "").replace("−", "-"));
  return Number.isFinite(v) ? { v, unit: (m[1] + (m[3] ?? "")).trim() } : null;
}

const TIME = /^(?:q[1-4]|h[12]|fy\s?\d{2,4}|\d{4}|\d{2}\.\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\s?월|\d\s?분기|\d{4}\s?년|week\s?\d+|w\d+)/i;

/**
 * A chart for a table of numbers, chosen the way the builder's samples use them: shares of a whole -> donut,
 * values over time -> line (5+ points) or bars, values by category -> bars. null when the table is not chart material.
 */
export function tableChart(head: string[], rows: string[][]): Chart | null {
  if (rows.length < 2 || rows.length > 8 || head.length < 2) return null;
  const labels = rows.map((r) => (r[0] ?? "").trim());
  if (labels.some((l) => !l) || labels.every((l) => cellNumber(l))) return null;
  const cols = head.map((h, c) => {
    if (c === 0) return null;
    const nums = rows.map((r) => cellNumber(r[c] ?? ""));
    if (nums.some((n) => !n)) return null;
    const unit = nums[0]!.unit;
    return nums.every((n) => n!.unit === unit) ? { c, name: h, unit, values: nums.map((n) => n!.v) } : null;
  }).filter((x): x is { c: number; name: string; unit: string; values: number[] } => !!x && x.values.every((v) => v >= 0));
  if (!cols.length) return null;

  const share = cols.find((x) => x.unit === "%" && Math.abs(x.values.reduce((a, b) => a + b, 0) - 100) <= 3);
  if (share && rows.length <= 6) {
    // The largest share goes in the middle, with its name under it.
    const top = share.values.indexOf(Math.max(...share.values));
    return { type: "donut", items: labels.map((label, i) => ({ label, value: share.values[i] })), center: `${share.values[top]}%`, sub: labels[top] };
  }

  const first = cols[0];
  const same = cols.filter((x) => x.unit === first.unit).slice(0, 3);
  const unit = same.length === 1 ? `${first.name}${first.unit && !first.name.includes(first.unit) ? ` (${first.unit})` : ""}` : first.unit;
  const series = same.map((x) => ({ name: x.name, values: x.values }));
  if (labels.every((l) => TIME.test(l))) {
    return rows.length >= 5 ? { type: "line", labels, series, unit, area: series.length === 1 } : { type: "bar", categories: labels, series, unit };
  }
  if (series.length > 1) return { type: "bar", categories: labels, series, unit };
  if (rows.length < 3) return null;
  return { type: "hbar", items: labels.map((label, i) => ({ label, value: first.values[i], text: rows[i][first.c] })) };
}

/** "Brand: Document name" on the cover; otherwise the whole title is the document. */
export function splitBrand(title: string): { brand: string; docname: string } {
  const m = /^(.{2,40}?)\s*[:：|—–-]\s+(.{2,})$/.exec(title.trim());
  return m ? { brand: m[1], docname: m[2] } : { brand: title.trim(), docname: "" };
}

export function design(slides: Slide[], o: DesignOptions): Designed {
  const pages: PageSpec[] = [];
  const titles: string[] = [];
  const pageSlide: number[] = [];
  const add = (p: PageSpec, t: string, si: number) => { pages.push(p); titles.push(t); pageSlide.push(si); };

  const coverSlide = slides.find((s) => s.layout === "title") ?? slides[0];
  const deckTitle = coverSlide?.title ?? "";
  const { brand, docname } = splitBrand(deckTitle);
  const doc: DocInfo = { brand, docname: docname || o.kind, notice: o.notice, logo: o.logo };
  const contact: string[] = o.contact ? [o.contact] : [];
  let section = "";

  slides.forEach((s, si) => {
    if (si > 0 && si === slides.length - 1 && THANKS.test(s.title.trim())) {
      (s.bullets ?? []).filter((b) => CONTACT.test(b)).forEach((b) => contact.push(b));
      return;
    }
    // Contact lines leave the page they are on and go to the closing page.
    const all = (s.bullets ?? []).map((b) => b.trim()).filter(Boolean);
    const items = all.filter((b) => !CONTACT.test(b));
    all.filter((b) => CONTACT.test(b)).forEach((b) => contact.push(b.replace(/^\s*(?:contact|email|e-mail|문의|연락처)\s*[:：]\s*/i, "")));
    const kicker = section && section.toLowerCase() !== s.title.trim().toLowerCase() ? section : "";
    const base = { kicker, title: s.title };

    switch (s.layout) {
      case "title":
        add({
          type: "cover", kicker: o.kind, title: docname || deckTitle, subtitle: s.subtitle || items.join(" "),
          photo: o.photo, meta: o.date ? [[o.lang === "ko" ? "작성" : "Date", o.date]] : undefined,
        }, o.lang === "ko" ? "표지" : "Cover", si);
        return;
      case "section":
        section = s.title;
        return;
      case "stats": {
        const kp: Kpi[] = (s.stats ?? []).filter((x) => x.value).slice(0, 4).map((x) => ({ label: x.label, ...splitValue(x.value) }));
        add({ type: "kpis", ...base, items: kp, box: items.length ? items.join(" ") : undefined }, s.title, si);
        return;
      }
      case "table": {
        const [head = [], ...rows] = s.table ?? [];
        const align = head.map((_, c) => (c > 0 && rows.length && rows.every((r) => /^[\s$€£¥₩]*[\-−+]?[\d][\d,.]*\s*(?:%|[A-Za-z가-힣/]{0,6})$/.test(r[c] ?? "")) ? "n" : "l") as "l" | "n");
        // Numbers become a chart with the table beside it, as on the samples; a wide table keeps its own page.
        const chart = tableChart(head, rows);
        if (chart && head.length <= 4) {
          const side: SideTable = { columns: head, rows: rows.map((r) => head.map((_, k) => r[k] ?? "")), align };
          add({ type: "chart", ...base, chart, side: { table: side } }, s.title, si);
          return;
        }
        if (chart) add({ type: "chart", ...base, chart }, s.title, si);
        chunk(rows, 7).forEach((p, n) =>
          add({ type: "table", ...base, title: n ? `${s.title} (${n + 1})` : s.title, columns: head, rows: p.map((r) => head.map((_, k) => r[k] ?? "")), align }, s.title, si));
        return;
      }
      case "quote": {
        const m = /^["“](.+)["”]\s*(?:[—–-]\s*(.+))?$/.exec((s.quote ?? "").trim());
        add({ type: "quote", ...base, quote: m ? m[1] : s.quote ?? "", by: m?.[2] }, s.title, si);
        return;
      }
    }

    if (!items.length) {
      if (s.subtitle) add({ type: "summary", ...base, lead: s.subtitle }, s.title, si);
      else if (!all.length) add({ type: "summary", ...base }, s.title, si);
      return;
    }
    const labeled = items.map((i) => LABELED.exec(i));
    if (s.ordered && items.length >= 2 && items.length <= 5) {
      add({ type: "steps", ...base, steps: items.map((i, n) => (labeled[n] ? { title: labeled[n]![1], text: labeled[n]![2] } : { title: i })) }, s.title, si);
    } else if (items.length === 1 && items[0].length > 90) {
      add({ type: "summary", ...base, lead: items[0] }, s.title, si);
    } else {
      chunk(items, 6).forEach((p, n) =>
        add({
          type: "points", ...base, title: n ? `${s.title} (${n + 1})` : s.title,
          items: p.map((i) => { const m = LABELED.exec(i); return m ? { title: m[1], text: m[2] } : { title: i }; }),
          cols: p.length === 4 ? 2 : Math.min(3, p.length),
        }, s.title, si));
    }
  });

  const close = o.lang === "ko" ? "감사합니다" : "Thank you";
  add({ type: "closing", title: close, text: deckTitle, contact: [...new Set(contact)].slice(0, 4) }, close, -1);
  return { doc, pages, titles, pageSlide };
}
