import type { Block } from "../types";

const LIST_RE = /^\s*(?:[-*•·▪]|\d+[.)])\s+(.*)$/;
const ORDERED_RE = /^\s*\d+[.)]\s+/;
/** A line that is one quotation, with an optional "— Name" after it. */
const QUOTE_RE = /^["“][^"“”]{8,}["”](?:\s*[—–-]\s*\S.{0,60})?$/;
const TABLE_RE = /^\s*\|.*\|\s*$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function clean(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => clean(c));
}

/** A short line with no sentence ending, followed by text, reads as a heading in plain-text documents. */
function looksLikeHeading(line: string, next: string | undefined): boolean {
  const t = line.trim();
  if (!t || !next || !next.trim()) return false;
  if (t.length > 60) return false;
  if (/[.!?。:,;]$/.test(t)) return false;
  if (LIST_RE.test(t) || TABLE_RE.test(t)) return false;
  return next.trim().length > t.length;
}

/** Parses Markdown or plain text into structural blocks. */
export function parseDocument(input: string): Block[] {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    // Consecutive lines that each end a sentence are separate points, not one wrapped paragraph.
    const lines = para.length >= 2 && para.every((l) => /[.!?。]$/.test(l)) ? para : [para.join(" ")];
    for (const l of lines) {
      const text = clean(l);
      if (text) blocks.push(QUOTE_RE.test(text) ? { type: "quote", text } : { type: "para", text });
    }
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      flushPara();
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      const level = Math.min(h[1].length, 3) as 1 | 2 | 3;
      blocks.push({ type: "heading", level, text: clean(h[2]) });
      continue;
    }

    if (TABLE_RE.test(line)) {
      flushPara();
      const rows: string[][] = [];
      while (i < lines.length && TABLE_RE.test(lines[i].trim())) {
        if (!TABLE_SEP_RE.test(lines[i].trim())) rows.push(splitRow(lines[i]));
        i++;
      }
      i--;
      if (rows.length) blocks.push({ type: "table", rows });
      continue;
    }

    if (LIST_RE.test(line)) {
      flushPara();
      const ordered = ORDERED_RE.test(line);
      const items: string[] = [];
      while (i < lines.length && lines[i].trim() && LIST_RE.test(lines[i])) {
        items.push(clean(LIST_RE.exec(lines[i])![1]));
        i++;
      }
      i--;
      const kept = items.filter(Boolean);
      // "- 1. Pick a plan" (PPTX bullets that carry their own numbers) is an ordered list.
      const numbered = kept.length >= 2 && kept.every((t) => ORDERED_RE.test(t));
      if (kept.length === 1 && QUOTE_RE.test(kept[0])) blocks.push({ type: "quote", text: kept[0] });
      else blocks.push({ type: "list", items: numbered ? kept.map((t) => t.replace(ORDERED_RE, "")) : kept, ordered: ordered || numbered });
      continue;
    }

    if (line.startsWith(">")) {
      flushPara();
      const q: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        q.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      i--;
      blocks.push({ type: "quote", text: clean(q.join(" ")) });
      continue;
    }

    if (!para.length && looksLikeHeading(line, lines[i + 1])) {
      blocks.push({ type: "heading", level: blocks.length === 0 ? 1 : 2, text: clean(line) });
      continue;
    }

    para.push(line);
  }
  flushPara();
  return blocks;
}

/** Converts simple HTML (from .docx via mammoth) to Markdown so one parser handles everything. */
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: string[] = [];
  const text = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();

  for (const el of Array.from(doc.body.children)) {
    const tag = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) out.push(`${"#".repeat(Math.min(+tag[1], 3))} ${text(el)}`);
    else if (tag === "ul" || tag === "ol") {
      Array.from(el.querySelectorAll(":scope > li")).forEach((li, n) =>
        out.push(tag === "ol" ? `${n + 1}. ${text(li)}` : `- ${text(li)}`),
      );
    } else if (tag === "table") {
      const rows = Array.from(el.querySelectorAll("tr")).map((tr) =>
        Array.from(tr.querySelectorAll("th,td")).map((c) => text(c).replace(/\|/g, "/")),
      );
      rows.forEach((r, n) => {
        out.push(`| ${r.join(" | ")} |`);
        if (n === 0) out.push(`|${r.map(() => " --- ").join("|")}|`);
      });
    } else if (tag === "blockquote") out.push(`> ${text(el)}`);
    else if (text(el)) out.push(text(el));
    out.push("");
  }
  return out.join("\n");
}
