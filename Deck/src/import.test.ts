import { describe, expect, it } from "vitest";
import { joinRuns, tidy, unspace } from "./import";

describe("PDF text clean-up", () => {
  it("drops icon-font glyphs", () => {
    expect(tidy("Peak  hours ")).toBe("Peak hours");
  });
  it("joins split pieces of a word and keeps real gaps", () => {
    const h = 20;
    expect(joinRuns([{ x: 0, w: 60, s: "AUTOM", h }, { x: 60.5, w: 20, s: "AT", h }, { x: 80, w: 30, s: "ION", h }])).toBe("AUTOMATION");
    expect(joinRuns([{ x: 0, w: 50, s: "Peak", h }, { x: 56, w: 50, s: "hours", h }])).toBe("Peak hours");
  });
  it("closes up letter-spaced labels", () => {
    expect(unspace("N O R T H L I N E")).toBe("NORTHLINE");
    expect(unspace("01 — P H I L O S O P H Y")).toBe("01 — PHILOSOPHY");
    expect(unspace("Plan A or B")).toBe("Plan A or B");
    expect(unspace("Q 3 results")).toBe("Q 3 results");
  });
});
