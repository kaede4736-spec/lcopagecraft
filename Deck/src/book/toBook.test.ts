import { describe, expect, it } from "vitest";
import { parseDocument } from "../engine/parse";
import { buildSlides } from "../engine/build";
import { SAMPLE } from "../sample";
import { parseValue, splitTitle, toBook } from "./toBook";

describe("toBook", () => {
  const slides = buildSlides(parseDocument(SAMPLE));
  const book = toBook(slides, { form: "proposal", lang: "en" });

  it("starts with a cover and ends with an automatic closing page", () => {
    expect(book.D.pages[0].type).toBe("cover");
    expect(book.D.pages.at(-1)!.type).toBe("close");
    expect(book.pageSlide.at(-1)).toBe(-1);
    expect(book.D.titles).toHaveLength(book.D.pages.length);
  });

  it("uses the form palette and splits the cover title", () => {
    expect(book.D.theme.ink).toBe("#2b3038");
    expect(book.D.meta.tag).toBe("PROPOSAL");
    expect([book.D.meta.t1, book.D.meta.t2]).toEqual(["Northwind Coffee", "Q3 2026 Business Review"]);
  });

  it("maps numbers, tables, steps and quotes to engine layouts", () => {
    const types = book.D.pages.map((p) => p.type);
    expect(types).toContain("stats");
    expect(types).toContain("table");
    expect(types).toContain("steps");
    expect(types).toContain("quote");
    const stats = book.D.pages.find((p) => p.type === "stats");
    expect(stats && stats.type === "stats" && stats.cards[0]).toMatchObject({ pre: "$", v: 4.2, dec: 1, u: "M" });
  });

  it("builds video scenes from page titles", () => {
    const scenes = book.CFG.scenes as { t: string }[];
    expect(scenes.length).toBeGreaterThan(2);
    expect(scenes.length).toBeLessThanOrEqual(8);
  });

  it("turns 'Label: text' points into rows", () => {
    const b = toBook(
      [
        { id: "a", layout: "title", title: "T" },
        { id: "b", layout: "bullets", title: "Risks", bullets: ["Cost: green coffee prices rose", "Leases: two end in March"] },
      ],
      { form: "report", lang: "ko" },
    );
    expect(b.D.pages[1]).toMatchObject({ type: "rows", rows: [["Cost", "green coffee prices rose"], ["Leases", "two end in March"]] });
  });
});

describe("helpers", () => {
  it("parses values with prefixes, decimals and units", () => {
    expect(parseValue("12억 원")).toEqual({ pre: "", v: 12, dec: 0, u: "억 원" });
    expect(parseValue("1,240")).toEqual({ pre: "", v: 1240, dec: 0, u: "" });
    expect(parseValue("92%")).toEqual({ pre: "", v: 92, dec: 0, u: "%" });
  });
  it("splits titles on a colon or near the middle", () => {
    expect(splitTitle("2026 하반기 사업 계획")).toEqual(["2026 하반기 사업 계획", ""]);
    expect(splitTitle("Q3 Review: Results and plan")).toEqual(["Q3 Review", "Results and plan"]);
    expect(splitTitle("북촌커피 2026년 3분기 사업 보고")).toEqual(["북촌커피 2026년", "3분기 사업 보고"]);
  });
});

describe("deck endings", () => {
  it("drops the deck's own thank-you slide and keeps its contact for the closing page", () => {
    const slides = buildSlides(parseDocument("# Plan\n\n## Roadmap\n\n- Phase 1: launch\n- Phase 2: grow\n\n## Thank you\n\n- Contact: plan@example.com\n"));
    const { D } = toBook(slides, { form: "proposal", lang: "en" });
    const thanks = D.pages.filter((p) => "title" in p && p.title === "Thank you");
    expect(thanks).toHaveLength(1);
    expect(thanks[0]).toMatchObject({ type: "close", contact: "plan@example.com" });
  });
});

import { plainText } from "./toBook";
describe("original text view", () => {
  it("drops Markdown marks", () => {
    const md = "# Lumen Bikes\n\n## The problem\n\n- Cars win\n- 1. Pick a plan\n\n| Plan | Price |\n| --- | --- |\n| Basic | $39 |";
    expect(plainText(md)).toBe("Lumen Bikes\n\nThe problem\n\n• Cars win\n1. Pick a plan\n\nPlan    Price\nBasic    $39");
  });
});
