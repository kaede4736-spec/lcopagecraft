// SVG charts ported from the LCO Pagecraft builder (pagecraft_builder/lib/charts.py): bar, hbar, line, donut.
// Every chart is an <svg class="anim">. Data marks (bars, lines, dots, value labels) carry class="dm": they are drawn
// on their own transparent layer, which the 3D book reveals with a wipe when the page opens, while axes, grid
// lines and labels stay on the page itself.

import type { Theme } from "./themes";

export type Chart =
  | { type: "bar"; categories: string[]; series: { name: string; values: number[] }[]; unit?: string; stacked?: boolean }
  | { type: "hbar"; items: { label: string; value: number; text?: string }[]; unit?: string; max?: number }
  | { type: "line"; labels: string[]; series: { name: string; values: number[] }[]; unit?: string; area?: boolean; min?: number }
  | { type: "donut"; items: { label: string; value: number }[]; center?: string; sub?: string };

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Number for a label: whole numbers plain, otherwise 1 or 2 decimals, with thousands separators. */
export function fmt(v: number, d?: number) {
  if (d === undefined) d = Number.isInteger(v) ? 0 : Math.abs(v) >= 10 ? 1 : 2;
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

const t = (x: number, y: number, s: unknown, size = 16, fill = "#333", anchor = "start", weight = 400, cls = "") =>
  `<text${cls ? ` class="${cls}"` : ""} x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${esc(s)}</text>`;

function nice(mx: number): [number, number[]] {
  if (mx <= 0) return [1, [0, 1]];
  const e = 10 ** Math.floor(Math.log10(mx)), f = mx / e;
  const step = (f <= 1 ? 0.2 : f <= 2.5 ? 0.5 : f <= 5 ? 1 : 2) * e;
  const top = Math.ceil(mx / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(+v.toFixed(10));
  return [top, ticks];
}

const svg = (w: number, h: number, body: string, dir = "right", delay = 0) =>
  `<svg class="anim" data-dir="${dir}" data-delay="${delay}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

function bar(c: Extract<Chart, { type: "bar" }>, th: Theme) {
  const { categories: cats, series } = c, stacked = !!c.stacked, col = th.series, C = th.c;
  const W = 1000, H = 560, L = 70, B = 56, T = 40;
  const tot = cats.map((_, i) => (stacked ? series.reduce((a, s) => a + s.values[i], 0) : Math.max(...series.map((s) => s.values[i]))));
  const [top, ticks] = nice(Math.max(...tot) * 1.08);
  const ys = (v: number) => T + (H - T - B) * (1 - v / top);
  const o: string[] = [];
  for (const v of ticks) {
    o.push(`<line x1="${L}" x2="${W}" y1="${ys(v).toFixed(1)}" y2="${ys(v).toFixed(1)}" stroke="${C.line}" stroke-width="${v === 0 ? 2 : 1}"/>`);
    o.push(t(L - 12, ys(v) + 6, fmt(v), 15, C.soft, "end"));
  }
  if (c.unit) o.push(t(L, 18, c.unit, 15, C.mid));
  const n = cats.length, slot = (W - L) / n, groups = stacked ? 1 : series.length;
  const bw = Math.min(120, (slot * 0.62) / groups);
  cats.forEach((cat, i) => {
    const x0 = L + slot * i + (slot - bw * groups) / 2;
    let acc = 0;
    series.forEach((s, j) => {
      const v = s.values[i], colr = col[j % col.length];
      if (stacked) {
        const y1 = ys(acc + v), y2 = ys(acc); acc += v;
        o.push(`<rect class="dm" x="${x0.toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, y2 - y1 - 2).toFixed(1)}" fill="${colr}"/>`);
        if (y2 - y1 > 24) o.push(t(x0 + bw / 2, (y1 + y2) / 2 + 6, fmt(v), 15, "#fff", "middle", 600, "dm"));
      } else {
        const xx = x0 + j * bw;
        o.push(`<rect class="dm" x="${xx.toFixed(1)}" y="${ys(v).toFixed(1)}" width="${(bw * 0.9).toFixed(1)}" height="${(ys(0) - ys(v)).toFixed(1)}" fill="${colr}"/>`);
        o.push(t(xx + bw * 0.45, ys(v) - 9, fmt(v), 15, C.ink, "middle", 600, "dm"));
      }
    });
    if (stacked) o.push(t(x0 + bw / 2, ys(acc) - 10, fmt(acc), 18, C.ink, "middle", 600, "dm"));
    o.push(t(L + slot * i + slot / 2, H - 22, cat, 16, C.ink, "middle"));
  });
  if (series.length > 1) {
    let x = L;
    series.forEach((s, j) => {
      o.push(`<rect x="${x}" y="${H - 12}" width="14" height="12" fill="${col[j % col.length]}" stroke="${C.line}"/>`);
      o.push(t(x + 20, H - 1, s.name, 14, C.mid));
      x += 40 + s.name.length * 9;
    });
  }
  return svg(W, H, o.join(""), "up");
}

function hbar(c: Extract<Chart, { type: "hbar" }>, th: Theme) {
  const items = c.items, C = th.c, W = 1000, rh = 64, L = 230, R = 150;
  const H = rh * items.length + 30, mx = c.max ?? Math.max(...items.map((i) => i.value));
  const xs = (v: number) => L + ((W - L - R) * v) / mx;
  const o: string[] = [];
  items.forEach((it, k) => {
    const y = 10 + k * rh, bh = rh * 0.42, yc = y + rh / 2, colr = k === 0 ? th.series[1] : th.series[0];
    o.push(t(0, yc + 6, it.label, 18, C.ink, "start", 600));
    o.push(`<rect x="${L}" y="${(yc - bh / 2).toFixed(1)}" width="${(xs(mx) - L).toFixed(1)}" height="${bh.toFixed(1)}" fill="${C.card}"/>`);
    if (it.value > 0) o.push(`<rect class="dm" x="${L}" y="${(yc - bh / 2).toFixed(1)}" width="${(xs(it.value) - L).toFixed(1)}" height="${bh.toFixed(1)}" fill="${colr}"/>`);
    o.push(t(W, yc + 2, it.text ?? fmt(it.value) + (c.unit ?? ""), 19, C.ink, "end", 600, "dm"));
  });
  return svg(W, H, o.join(""), "right");
}

function line(c: Extract<Chart, { type: "line" }>, th: Theme) {
  const { labels, series } = c, col = th.series, C = th.c;
  const W = 1000, H = 520, L = 74, B = 50, T = 40;
  const all = series.flatMap((s) => s.values);
  const lo = c.min ?? 0;
  const [top, ticks] = nice((Math.max(...all) - lo) * 1.1);
  const ys = (v: number) => T + (H - T - B) * (1 - (v - lo) / top);
  const xs = (i: number) => L + 20 + ((W - L - 40) * i) / Math.max(1, labels.length - 1);
  const o: string[] = [];
  for (const v of ticks) {
    o.push(`<line x1="${L}" x2="${W}" y1="${ys(v + lo).toFixed(1)}" y2="${ys(v + lo).toFixed(1)}" stroke="${C.line}"/>`);
    o.push(t(L - 12, ys(v + lo) + 6, fmt(v + lo), 15, C.soft, "end"));
  }
  const step = Math.max(1, Math.floor(labels.length / 8));
  labels.forEach((lb, i) => { if (i % step === 0 || i === labels.length - 1) o.push(t(xs(i), H - 16, lb, 15, C.mid, "middle")); });
  if (c.unit) o.push(t(L, 18, c.unit, 15, C.mid));
  series.forEach((s, j) => {
    const colr = j === 0 && c.area ? C.accent : col[j % col.length];
    const pts = s.values.map((v, i) => [xs(i), ys(v)] as const);
    const d = "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L");
    if (c.area && j === 0) {
      const last = pts[pts.length - 1], first = pts[0];
      o.push(`<path class="dm" d="${d} L${last[0].toFixed(1)},${ys(lo).toFixed(1)} L${first[0].toFixed(1)},${ys(lo).toFixed(1)} Z" fill="${colr}" opacity=".22"/>`);
    }
    o.push(`<path class="dm" d="${d}" fill="none" stroke="${colr}" stroke-width="3.5"/>`);
    for (const [x, y] of pts) o.push(`<circle class="dm" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${colr}"/>`);
    const [lx, ly] = pts[pts.length - 1];
    o.push(t(lx, ly - 14, fmt(s.values[s.values.length - 1]), 18, C.ink, "middle", 600, "dm"));
  });
  if (series.length > 1) {
    let x = L;
    series.forEach((s, j) => {
      const colr = col[j % col.length];
      o.push(`<rect x="${x}" y="6" width="14" height="4" fill="${colr}"/>`);
      o.push(t(x + 20, 13, s.name, 14, C.mid));
      x += 50 + s.name.length * 9;
    });
  }
  return svg(W, H, o.join(""), "right");
}

function donut(c: Extract<Chart, { type: "donut" }>, th: Theme) {
  const items = c.items, col = th.series, C = th.c, W = 1000, H = 520, cx = 260, cy = 260, R = 220, r = 140;
  const tot = items.reduce((a, i) => a + i.value, 0);
  let a0 = -Math.PI / 2;
  const o: string[] = [];
  const p = (a: number, rr: number) => `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  items.forEach((it, k) => {
    const colr = col[k % col.length], a1 = a0 + (2 * Math.PI * it.value) / tot, large = a1 - a0 > Math.PI ? 1 : 0;
    o.push(`<path class="dm" d="M${p(a0, R)} A${R},${R} 0 ${large} 1 ${p(a1, R)} L${p(a1, r)} A${r},${r} 0 ${large} 0 ${p(a0, r)} Z" fill="${colr}"/>`);
    const y = 120 + k * 64;
    o.push(`<rect x="560" y="${y - 18}" width="20" height="20" fill="${colr}"/>`);
    o.push(t(594, y, it.label, 22, C.ink, "start", 600));
    o.push(t(990, y, `${((it.value / tot) * 100).toFixed(1)}%`, 24, colr, "end", 600, "dm"));
    a0 = a1;
  });
  if (c.center) o.push(t(cx, cy + 16, c.center, 64, C.ink, "middle", 600));
  if (c.sub) o.push(t(cx, cy + 52, c.sub, 20, C.mid, "middle"));
  return svg(W, H, o.join(""), "right");
}

export function renderChart(c: Chart, th: Theme): string {
  switch (c.type) {
    case "bar": return bar(c, th);
    case "hbar": return hbar(c, th);
    case "line": return line(c, th);
    case "donut": return donut(c, th);
  }
}
