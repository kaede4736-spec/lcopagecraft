import { describe, expect, it } from "vitest";
import { parseDocument } from "./parse";
import { buildSlides, extractStat, shorten } from "./build";

const md = `# Q3 Market Report

Revenue grew faster than planned this quarter. Details follow.

## Results

- Revenue reached $4.2M, up from $3.1M
- Gross margin improved to 62%
- New customers: 1,240 accounts

## Risks

Supply costs may rise in Q4. We have two suppliers under review.

Hiring is behind plan by three roles.

| Region | Revenue | Growth |
| --- | --- | --- |
| US | $2.1M | 31% |
| EU | $1.4M | 22% |

> Customers want faster onboarding.
`;

describe("parseDocument", () => {
  it("reads headings, lists, tables and quotes", () => {
    const blocks = parseDocument(md);
    expect(blocks.map((b) => b.type)).toEqual([
      "heading", "para", "heading", "list", "heading", "para", "para", "table", "quote",
    ]);
  });

  it("treats short unpunctuated lines as headings in plain text", () => {
    const blocks = parseDocument("Annual Plan\nThis year we focus on retention and pricing.\n");
    expect(blocks[0]).toEqual({ type: "heading", level: 1, text: "Annual Plan" });
  });
});

describe("buildSlides", () => {
  const slides = buildSlides(parseDocument(md));

  it("opens with a title slide", () => {
    expect(slides[0]).toMatchObject({ layout: "title", title: "Q3 Market Report" });
    expect(slides[0].subtitle).toBe("Revenue grew faster than planned this quarter.");
  });

  it("turns numeric lists into a stats slide", () => {
    const stats = slides.find((s) => s.layout === "stats");
    expect(stats?.stats?.map((s) => s.value)).toEqual(["$4.2M", "62%", "1,240"]);
  });

  it("adds section dividers, tables and quotes", () => {
    expect(slides.filter((s) => s.layout === "section").map((s) => s.title)).toEqual(["Results", "Risks"]);
    expect(slides.find((s) => s.layout === "table")?.table?.[0]).toEqual(["Region", "Revenue", "Growth"]);
    expect(slides.some((s) => s.layout === "quote")).toBe(true);
  });

  it("splits long lists to 5 bullets per slide", () => {
    const list = Array.from({ length: 12 }, (_, i) => `- Point number ${i + 1} about scope`).join("\n");
    const s = buildSlides(parseDocument(`# T\n\n## A\n\n${list}`));
    const bullets = s.filter((x) => x.layout === "bullets");
    expect(bullets.map((b) => b.bullets!.length)).toEqual([5, 5, 2]);
  });
});

describe("plain-text Korean documents", () => {
  const ko = `2026 하반기 사업 계획
올해 하반기에는 신규 고객 확보와 단가 개선에 집중합니다.

상반기 성과
매출은 12억 원으로 목표 대비 108%를 달성했습니다.
신규 고객사는 46곳이 늘었습니다.
재계약률은 91%를 유지했습니다.

하반기 과제
영업 인력이 부족해 수도권 외 지역 대응이 늦어지고 있습니다. 3분기 안에 2명을 충원합니다.

원자재 단가가 두 분기 연속 올랐습니다. 장기 계약으로 4분기 물량의 70%를 고정합니다.
`;
  const slides = buildSlides(parseDocument(ko));

  it("keeps one point per sentence line and shows them as numbers", () => {
    const stats = slides.find((s) => s.layout === "stats");
    expect(stats?.stats?.map((s) => s.value)).toEqual(["12억 원", "46곳", "91%"]);
  });

  it("keeps long sentences as bullets even when they contain numbers", () => {
    const last = slides[slides.length - 1];
    expect(last.layout).toBe("bullets");
    expect(last.bullets).toHaveLength(2);
  });
});

describe("helpers", () => {
  it("extracts Korean units", () => {
    expect(extractStat("신규 고객이 1,200명 늘었습니다.")?.value).toBe("1,200명");
    expect(extractStat("매출 38% 증가")?.value).toBe("38%");
  });
  it("shortens on a word boundary", () => {
    expect(shorten("alpha beta gamma delta", 14)).toBe("alpha beta…");
  });
});

describe("PPTX-style text", () => {
  const deck = buildSlides(parseDocument(`# Pitch

## How it works

- 1. Pick a plan
- 2. We deliver the bike
- 3. Swap any time

## Traction

- Subscribers: 18,400
- Churn: 2.1%
- Repair turnaround: 26 hours

## Riders

- “I sold my second car the month I joined.” — Dana

## Team

- Founded by two engineers
- Based in Rotterdam
`));
  it("treats self-numbered bullets as steps without the numbers", () => {
    const s = deck.find((x) => x.title === "How it works" && x.layout !== "section")!;
    expect(s.ordered).toBe(true);
    expect(s.bullets).toEqual(["Pick a plan", "We deliver the bike", "Swap any time"]);
  });
  it("keeps every figure on a stats page", () => {
    expect(deck.find((x) => x.title === "Traction" && x.layout !== "section")!.stats).toHaveLength(3);
  });
  it("turns a lone quotation into a quote page", () => {
    expect(deck.find((x) => x.title === "Riders" && x.layout !== "section")!.layout).toBe("quote");
  });
  it("adds no automatic takeaways page", () => {
    expect(deck.at(-1)!.title).toBe("Team");
  });
});
