// Page design ported from the LCO Pagecraft builder (pagecraft_builder/lib/pages.py), landscape 1600x900.
// Same CSS, same page types, same markup, so a Deck page looks like a Pagecraft sample page.

import { renderChart, type Chart } from "./charts";
import type { Theme } from "./themes";

export interface Kpi { label: string; value: string; unit?: string; delta?: string; vs?: string; note?: string }
export interface Item { title: string; text?: string; no?: string }
export interface Step { title: string; text?: string; when?: string }
export interface SideTable { columns: string[]; rows: string[][]; align?: ("l" | "n")[] }

interface Base { label?: string; kicker?: string; title?: string; lead?: string; note?: string; box?: string }
export type PageSpec =
  | ({ type: "cover"; title: string; subtitle?: string; photo?: string; meta?: [string, string][] } & Base)
  | ({ type: "summary"; kpis?: Kpi[]; points?: Item[] } & Base)
  | ({ type: "kpis"; items: Kpi[]; cols?: number } & Base)
  | ({ type: "table"; columns: string[]; rows: string[][]; align?: ("l" | "n")[]; total?: string[] } & Base)
  | ({ type: "chart"; chart: Chart; side?: { table?: SideTable; kpis?: Kpi[]; text?: string } } & Base)
  | ({ type: "points"; items: Item[]; cols?: number } & Base)
  | ({ type: "steps"; steps: Step[] } & Base)
  | ({ type: "photo"; photo: string; text?: string; caption?: string; facts?: [string, string][] } & Base)
  | ({ type: "quote"; quote: string; by?: string; photo?: string } & Base)
  | ({ type: "closing"; title: string; text?: string; contact?: string[]; photo?: string } & Base);

export interface DocInfo {
  /** Company or product name: cover top line and page header. */
  brand: string;
  /** Document name in the page header. */
  docname: string;
  /** Small line at the foot of the cover and closing page. */
  notice?: string;
  /** Brand logo (data URL) shown on the cover in place of the brand name. */
  logo?: string;
}

export const W = 1600, H = 900;
const PX = 80, PY = 56;

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Inline text: **bold**, ==highlight==, line breaks. */
export function md(s: unknown) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/==(.+?)==/g, '<em class="hi">$1</em>')
    .replace(/\n/g, "<br/>");
}

/** Sentence case for all-caps Latin labels: 'Q4 PLAN' -> 'Q4 plan'. Short acronyms stay. */
export function sentence(s: string) {
  s = String(s ?? "");
  if (!/[A-Z]{4,}/.test(s) || s !== s.toUpperCase()) return s;
  const out = s.split(" ").map((x) => (x.length <= 3 || /\d/.test(x) ? x : x.toLowerCase())).join(" ");
  const i = out.search(/\p{L}/u);
  return i < 0 ? out : out.slice(0, i) + out[i].toUpperCase() + out.slice(i + 1);
}

export const SANS = "Pretendard";
export const SERIF = "Noto Serif KR";

export function css(th: Theme) {
  const c = th.c;
  const head = th.head === "serif" ? `'${SERIF}',serif` : `${SANS},sans-serif`;
  return `
*{box-sizing:border-box;margin:0;padding:0}
section.pg{font-family:${SANS},sans-serif;color:${c.ink};font-feature-settings:"tnum";-webkit-font-smoothing:antialiased;
  width:${W}px;height:${H}px;position:relative;overflow:hidden;background:${c.paper};display:flex;flex-direction:column;padding:${PY}px ${PX}px ${PY - 10}px;word-break:keep-all;overflow-wrap:break-word}
.hd{display:flex;justify-content:space-between;align-items:baseline;font-size:15px;color:${c.mid};padding-bottom:12px;border-bottom:2px solid ${c.ink};flex:none}
.hd b{color:${c.ink};font-weight:600}
.hd .pn{font-variant-numeric:tabular-nums}
.kick{margin-top:28px;font-size:16px;font-weight:600;color:${c.hi};flex:none}
.ttl{font-family:${head};font-size:44px;font-weight:600;line-height:1.28;letter-spacing:-.02em;margin-top:8px;flex:none}
.lead{font-size:20px;line-height:1.65;color:${c.mid};margin-top:12px;max-width:1100px;flex:none}
.lead b,.txt b{color:${c.ink};font-weight:600}
b{font-weight:600}
em.hi{font-style:normal;color:${c.hi}}
.body{flex:1;min-height:0;margin-top:28px;display:flex;gap:40px}
.col{display:flex;flex-direction:column;gap:20px;min-width:0}
.grow{flex:1}
.ft{display:flex;justify-content:space-between;font-size:13px;color:${c.soft};border-top:1px solid ${c.line};padding-top:12px;margin-top:16px;flex:none}
.ph{background-size:cover;background-position:center}
.chart{flex:1;min-height:0;display:flex} .chart svg{width:100%;height:100%;font-family:${SANS},sans-serif}
.k{font-size:15px;font-weight:500;color:${c.mid}}
table{border-collapse:collapse;width:100%}
th{font-size:14px;font-weight:500;color:${c.mid};text-align:left;padding:8px 12px;border-bottom:2px solid ${c.ink};white-space:nowrap}
td{font-size:17px;padding:12px 12px;border-bottom:1px solid ${c.line}}
th:first-child,td:first-child{padding-left:0} th:last-child,td:last-child{padding-right:0}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums} tr.tot td{font-weight:600;border-bottom:2px solid ${c.ink}}
.kpis{display:grid;border-top:2px solid ${c.ink}}
.kpi{padding:20px 24px 0 0} .kpi+.kpi{border-left:1px solid ${c.line};padding-left:24px}.kpis.one .kpi+.kpi{border-left:0;padding-left:0;border-top:1px solid ${c.line};margin-top:16px}
.kpi .v{font-family:${head};font-size:56px;font-weight:600;letter-spacing:-.02em;line-height:1.15;margin-top:8px;font-variant-numeric:tabular-nums;white-space:nowrap}
.kpi .v small{font-size:20px;font-weight:500;margin-left:4px;color:${c.mid}}
.kpi .d{font-size:16px;font-weight:600;color:${c.good};margin-top:8px} .kpi .d.neg{color:${c.bad}}
.kpi .d span{font-weight:400;color:${c.mid};margin-left:4px}
.kpi .l{font-size:15px;color:${c.mid};margin-top:4px;line-height:1.6}
.pt{border-top:2px solid ${c.ink};padding-top:16px}
.pt h4{font-size:23px;font-weight:600;line-height:1.4} .pt p{font-size:17px;line-height:1.65;color:${c.mid};margin-top:8px}
.pt .no{font-family:${head};font-size:20px;color:${c.hi};font-weight:500;margin-bottom:8px;font-variant-numeric:tabular-nums}
.box{background:${c.card};padding:24px 28px;font-size:17px;line-height:1.7}
.box b{color:${c.ink}}
.list{border-top:2px solid ${c.ink}}
.list .it{display:flex;gap:24px;padding:16px 0;border-bottom:1px solid ${c.line}}
.list .it .w{flex:none;width:112px;font-weight:600;color:${c.hi};font-size:18px}
.list .it h4{font-size:20px;font-weight:600} .list .it p{font-size:16px;color:${c.mid};line-height:1.6;margin-top:4px}
.quote{font-family:${head};font-size:40px;line-height:1.55;font-weight:500}
section.pg.cover{background:${c.cover};color:#fff;padding:0}
.cover .ph{position:absolute}
.cv-in{position:absolute;display:flex;flex-direction:column}
.cv-brand{font-weight:600;font-size:18px}
.cv-kick{color:${c.accent};font-weight:500;font-size:17px}
.cv-title{font-family:${head};font-weight:600;font-size:64px;line-height:1.2;letter-spacing:-.02em;margin-top:16px}
.cv-sub{font-size:21px;line-height:1.65;opacity:.78;margin-top:24px}
.cv-meta{display:flex;gap:48px;margin-top:36px} .cv-meta span{display:block;font-size:13px;opacity:.6} .cv-meta b{display:block;font-size:19px;font-weight:500;margin-top:4px}
.cv-note{position:absolute;left:${PX}px;right:${PX}px;bottom:28px;font-size:12px;opacity:.55;border-top:1px solid rgba(255,255,255,.18);padding-top:12px}
/* Roomy: a page with little on it (a slide's three lines rather than a report's paragraphs) sets the same
   parts larger, so the page reads as finished instead of half empty. Same rules, lines and colors. */
.roomy .ttl{font-size:52px}
.roomy .lead{font-size:23px}
.roomy .body{margin-top:40px}
.rows{border-top:2px solid ${c.ink}}
.rows .r{display:flex;gap:40px;align-items:baseline;padding:30px 0;border-bottom:1px solid ${c.line}}
.rows .r .no{flex:none;width:64px;font-family:${head};font-size:28px;font-weight:500;color:${c.hi};font-variant-numeric:tabular-nums}
.rows .r h4{font-size:32px;font-weight:600;line-height:1.4;letter-spacing:-.01em}
.rows .r p{font-size:21px;line-height:1.6;color:${c.mid};margin-top:8px}
.roomy .kpis{flex:1;align-items:stretch}
.roomy .kpi{padding-top:32px}
.roomy .kpi .k{font-size:19px}
.roomy .kpi .v{font-size:92px;margin-top:20px}
.roomy .kpi .v small{font-size:30px}
.roomy .kpi .l{font-size:18px}
.roomy td{font-size:23px;padding:22px 12px} .roomy th{font-size:17px;padding:12px 12px}
.roomy .stp h4{font-size:32px!important} .roomy .stp p{font-size:21px!important} .roomy .stp .no{font-size:22px!important}
.roomy .quote{font-size:56px;line-height:1.45}
`;
}

const header = (d: DocInfo, i: number, n: number) =>
  `<div class="hd"><b>${esc(d.brand)}</b><span>${esc(d.docname)} · <span class="pn">${String(i).padStart(2, "0")} / ${String(n).padStart(2, "0")}</span></span></div>`;
const footer = (p: Base, i: number) => `<div class="ft"><span>${md(p.note ?? "")}</span><span>${i}</span></div>`;
const titles = (p: Base) =>
  (p.kicker ? `<div class="kick">${esc(sentence(p.kicker))}</div>` : "") +
  (p.title ? `<h2 class="ttl">${md(p.title)}</h2>` : "") +
  (p.lead ? `<p class="lead">${md(p.lead)}</p>` : "");

function kpisHtml(items: Kpi[], cols = items.length) {
  return (
    `<div class="kpis${cols === 1 ? " one" : ""}" style="grid-template-columns:repeat(${cols},1fr)">` +
    items
      .map((it) => {
        const d = it.delta ?? "", neg = /^[-−]/.test(d);
        const vs = it.vs ? `<span>${esc(it.vs)}</span>` : "";
        return (
          `<div class="kpi"><div class="k">${esc(it.label)}</div><div class="v">${esc(it.value)}<small>${esc(it.unit ?? "")}</small></div>` +
          (d ? `<div class="d${neg ? " neg" : ""}">${esc(d)}${vs}</div>` : "") +
          (it.note ? `<div class="l">${md(it.note)}</div>` : "") +
          `</div>`
        );
      })
      .join("") +
    `</div>`
  );
}

function tableHtml(p: SideTable & { total?: string[] }) {
  const al = p.align ?? ["l", ...p.columns.slice(1).map(() => "n" as const)];
  const cls = (k: number) => (al[k] === "n" ? "n" : "");
  let h = "<table><tr>" + p.columns.map((c, k) => `<th class="${cls(k)}">${esc(c)}</th>`).join("") + "</tr>";
  for (const r of p.rows) h += "<tr>" + p.columns.map((_, k) => `<td class="${cls(k)}">${md(r[k] ?? "")}</td>`).join("") + "</tr>";
  if (p.total) h += '<tr class="tot">' + p.columns.map((_, k) => `<td class="${cls(k)}">${md(p.total![k] ?? "")}</td>`).join("") + "</tr>";
  return h + "</table>";
}

const boxAuto = (p: Base) => (p.box ? `<div class="box" style="margin-top:auto">${md(p.box)}</div>` : "");

function inner(p: PageSpec, th: Theme): string {
  const c = th.c;
  switch (p.type) {
    case "summary": {
      let b = '<div class="col grow">';
      if (p.kpis?.length) b += kpisHtml(p.kpis);
      if (p.points?.length) {
        const cols = Math.min(3, p.points.length);
        b += `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:28px;margin-top:${p.kpis?.length ? 48 : 0}px">` +
          p.points.map((it, k) => `<div class="pt"><div class="no">${String(k + 1).padStart(2, "0")}</div><h4>${md(it.title)}</h4><p>${md(it.text ?? "")}</p></div>`).join("") + "</div>";
      }
      return b + boxAuto(p) + "</div>";
    }
    case "kpis":
      return `<div class="col grow">${kpisHtml(p.items, p.cols ?? p.items.length)}${boxAuto(p)}</div>`;
    case "table":
      return `<div class="col grow">${tableHtml(p)}${boxAuto(p)}</div>`;
    case "chart": {
      const ch = `<div class="chart">${renderChart(p.chart, th)}</div>`;
      const sd = p.side;
      const side = sd ? (sd.table ? tableHtml(sd.table) : "") + (sd.kpis?.length ? kpisHtml(sd.kpis, 1) : "") + (sd.text ? `<div class="box">${md(sd.text)}</div>` : "") : "";
      if (!side) return `<div class="col grow">${ch}${p.box ? `<div class="box">${md(p.box)}</div>` : ""}</div>`;
      return `<div class="col" style="flex:1.55">${ch}</div><div class="col" style="flex:1">${side}</div>`;
    }
    case "points": {
      if (roomy(p)) {
        return `<div class="grow"><div class="rows">` +
          p.items.map((it, k) => `<div class="r"><div class="no">${esc(it.no ?? String(k + 1).padStart(2, "0"))}</div><div><h4>${md(it.title)}</h4>${it.text ? `<p>${md(it.text)}</p>` : ""}</div></div>`).join("") +
          "</div></div>";
      }
      const cols = p.cols ?? Math.min(3, p.items.length);
      return `<div class="grow" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:30px;align-content:start">` +
        p.items.map((it, k) => `<div class="pt"><div class="no">${esc(it.no ?? String(k + 1).padStart(2, "0"))}</div><h4>${md(it.title)}</h4><p>${md(it.text ?? "")}</p></div>`).join("") +
        "</div>";
    }
    case "steps": {
      const box = p.box ? `<div class="box">${md(p.box)}</div>` : "";
      return `<div class="col grow"><div class="grow" style="display:grid;grid-template-columns:repeat(${p.steps.length},1fr);border-top:2px solid ${c.ink};min-height:0">` +
        p.steps.map((s, k) =>
          `<div class="stp" style="display:flex;flex-direction:column;padding:28px 24px 0 ${k === 0 ? 0 : 24}px;${k ? "border-left:1px solid " + c.line : ""}"><div class="no" style="font-size:18px;color:${c.hi};font-weight:500">${String(k + 1).padStart(2, "0")}</div>` +
          `<h4 style="font-size:24px;font-weight:600;margin:8px 0 12px">${md(s.title)}</h4><p style="font-size:18px;color:${c.mid};line-height:1.65">${md(s.text ?? "")}</p>` +
          (s.when ? `<div style="font-size:17px;margin-top:auto;padding:16px 0 4px;font-weight:600;color:${c.hi}">${esc(s.when)}</div>` : "") + "</div>",
        ).join("") + "</div>" + box + "</div>";
    }
    case "photo": {
      const facts = (p.facts ?? []).map(([k, v]) => `<tr><td style="color:${c.mid};width:30%">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("");
      const info = `<div class="kick" style="margin-top:0">${esc(sentence(p.kicker ?? ""))}</div><h2 class="ttl">${md(p.title ?? "")}</h2>` +
        (p.text ? `<p class="lead">${md(p.text)}</p>` : "") + (facts ? `<table style="margin-top:20px">${facts}</table>` : "");
      const cap = p.caption ? `<div style="font-size:13px;color:${c.mid};margin-top:8px">${esc(p.caption)}</div>` : "";
      return `<div class="col" style="flex:1.3"><div class="ph grow" style="background-image:url(${p.photo})"></div>${cap}</div><div class="col" style="flex:1">${info}</div>`;
    }
    case "quote": {
      const ph = p.photo ? `<div class="ph" style="width:38%;background-image:url(${p.photo})"></div>` : "";
      return `${ph}<div class="col grow" style="justify-content:center"><div class="quote">“${md(p.quote)}”</div><div style="font-size:17px;color:${c.mid}">${esc(p.by ?? "")}</div></div>`;
    }
    default:
      return "";
  }
}

function cover(d: DocInfo, p: Extract<PageSpec, { type: "cover" }>, th: Theme) {
  const ph = p.photo
    ? `<div class="ph" style="left:${W * 0.42}px;top:0;right:0;bottom:0;background-image:url(${p.photo})"></div><div style="position:absolute;left:${W * 0.42}px;top:0;width:220px;bottom:0;background:linear-gradient(90deg,${th.c.cover},transparent)"></div>`
    : "";
  // Without a photo the text gets the width the photo would have taken.
  const w = p.photo ? W * 0.42 - PX - 30 : W * 0.62;
  const meta = (p.meta ?? []).map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("");
  return (
    `<section class="pg cover">${ph}<div class="cv-in" style="left:${PX}px;top:${PY + 8}px;width:${w}px;bottom:90px">` +
    (d.logo ? `<img src="${d.logo}" alt="" style="height:44px;max-width:280px;object-fit:contain;object-position:left"/>` : `<div class="cv-brand">${esc(d.brand)}</div>`) +
    `<div style="flex:1"></div>` +
    `<div class="cv-kick">${esc(sentence(p.kicker ?? ""))}</div><div class="cv-title">${md(p.title)}</div>` +
    (p.subtitle ? `<div class="cv-sub">${md(p.subtitle)}</div>` : "") +
    (meta ? `<div class="cv-meta">${meta}</div>` : "") +
    `</div><div class="cv-note">${md(d.notice ?? "")}</div></section>`
  );
}

function closing(d: DocInfo, p: Extract<PageSpec, { type: "closing" }>) {
  const ph = p.photo ? `<div class="ph" style="position:absolute;right:0;top:0;bottom:0;width:${W * 0.45}px;background-image:url(${p.photo})"></div>` : "";
  const w = p.photo ? W * 0.55 - PX : W - 2 * PX;
  const contact = (p.contact ?? []).map(esc).join("<br/>");
  return (
    `<section class="pg cover">${ph}<div class="cv-in" style="left:${PX}px;top:${PY + 10}px;width:${w}px;bottom:90px"><div class="cv-brand">${esc(d.brand)}</div>` +
    `<div class="cv-title" style="margin-top:60px;font-size:50px">${md(p.title)}</div>` +
    (p.text ? `<div class="cv-sub">${md(p.text)}</div>` : "") +
    (contact ? `<div style="margin-top:auto;font-size:17px;line-height:1.7;opacity:.85">${contact}</div>` : "") +
    `</div><div class="cv-note">${md(d.notice ?? "")}</div></section>`
  );
}

const NOTITLE = new Set(["photo", "quote"]);

const len = (...s: (string | undefined)[]) => s.reduce((n, x) => n + (x?.length ?? 0), 0);
/** Little enough content that the page should set it large. */
export function roomy(p: PageSpec): boolean {
  switch (p.type) {
    case "points": return p.items.length <= 4 && p.items.every((it) => len(it.title, it.text) <= 110);
    case "kpis": return p.items.length <= 4 && p.items.every((it) => !it.note || it.note.length < 60);
    case "table": return p.rows.length <= 4 && p.columns.length <= 5;
    case "steps": return p.steps.length <= 4 && p.steps.every((s) => len(s.title, s.text) <= 90);
    case "quote": return p.quote.length <= 140;
    case "summary": return !p.kpis?.length && !p.points?.length;
    default: return false;
  }
}

/** One page as a <section class="pg">, i is 1-based. */
export function pageHtml(d: DocInfo, p: PageSpec, th: Theme, i: number, n: number): string {
  if (p.type === "cover") return cover(d, p, th);
  if (p.type === "closing") return closing(d, p);
  return `<section class="pg${roomy(p) ? " roomy" : ""}">${header(d, i, n)}${NOTITLE.has(p.type) ? "" : titles(p)}<div class="body">${inner(p, th)}</div>${footer(p, i)}</section>`;
}
