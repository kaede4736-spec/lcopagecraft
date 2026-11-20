import { describe, expect, it } from "vitest";
import { parseDocument } from "../engine/parse";
import { buildSlides } from "../engine/build";
import { design, splitBrand, splitValue } from "./fromSlides";
import { pageHtml, roomy } from "./pages";
import { THEMES } from "./themes";

const MD = `# Lumen Bikes: Series A Pitch

City e-bikes on subscription.

## 18,400 riders in our first 14 months

- Subscribers: 18,400
- Monthly revenue: $1.2M
- Churn: 2.1%

## From the app to a bike in 48 hours

1. Pick a plan in the app
2. We deliver the bike in 48 hours
3. Swap or repair any time

## $8M to open six new cities

- Raising $8M to open 6 new cities in 2027
- Contact: founders@lumen.example
`;

describe("Pagecraft page design", () => {
  const d = design(buildSlides(parseDocument(MD)), { lang: "en", kind: "Proposal" });

  it("follows the builder's page types", () => {
    expect(d.pages.map((p) => p.type)).toEqual(["cover", "kpis", "steps", "points", "closing"]);
    expect(d.doc).toMatchObject({ brand: "Lumen Bikes", docname: "Series A Pitch" });
  });
  it("moves contact lines to the closing page", () => {
    const close = d.pages.at(-1)!;
    expect(close.type === "closing" && close.contact).toEqual(["founders@lumen.example"]);
    const ask = d.pages[3];
    expect(ask.type === "points" && ask.items.map((i) => i.title)).toEqual(["Raising $8M to open 6 new cities in 2027"]);
  });
  it("keeps compact values whole and sets word units small", () => {
    expect(splitValue("$1.2M")).toEqual({ value: "$1.2M", unit: "" });
    expect(splitValue("2.1%")).toEqual({ value: "2.1%", unit: "" });
    expect(splitValue("26 hours")).toEqual({ value: "26", unit: "hours" });
    expect(splitBrand("Quarterly review")).toEqual({ brand: "Quarterly review", docname: "" });
  });
  it("sets short pages large and escapes text", () => {
    expect(roomy(d.pages[2])).toBe(true);
    const html = pageHtml(d.doc, { type: "points", title: "<b>x</b>", items: [{ title: "a & b" }] }, THEMES.warm, 2, 5);
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(html).toContain("a &amp; b");
  });
});

import { cellNumber, tableChart } from "./fromSlides";
describe("charts from tables", () => {
  it("reads table numbers", () => {
    expect(cellNumber("$2.3M")).toEqual({ v: 2.3, unit: "$M" });
    expect(cellNumber("21,000")).toEqual({ v: 21000, unit: "" });
    expect(cellNumber("Bike, lock")).toBeNull();
  });
  it("shares of a whole make a donut", () => {
    const c = tableChart(["Channel", "Revenue", "Share"], [["Wholesale", "$2.3M", "55%"], ["Retail", "$1.2M", "29%"], ["Online", "$0.7M", "16%"]]);
    expect(c).toMatchObject({ type: "donut", center: "55%", sub: "Wholesale" });
  });
  it("quarters make bars, longer series make a line", () => {
    expect(tableChart(["Quarter", "Print", "E-book"], [["Q1", "21,000", "19,000"], ["Q2", "20,000", "23,000"]])).toMatchObject({ type: "bar" });
    const months = ["Jan", "Feb", "Mar", "Apr", "May"].map((m, i) => [m, String(10 + i)]);
    expect(tableChart(["Month", "Orders"], months)).toMatchObject({ type: "line" });
  });
  it("leaves text tables alone", () => {
    expect(tableChart(["Plan", "Includes"], [["Basic", "Bike"], ["Plus", "Insurance"]])).toBeNull();
  });
});
