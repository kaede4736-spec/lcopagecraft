// Document types. Each one uses one of the four LCO Pagecraft builder themes for its pages,
// and the theme's viewer colors for the 3D book around them.

import { THEMES, type Theme, type ThemeId } from "../design/themes";

export type FormId = "report" | "proposal" | "marketing" | "planning";

/** Colors the 3D viewer uses for its chrome (board, buttons, marks), derived from the page theme. */
export interface BookTheme {
  ink: string; dark2: string; acc: string;
  c1: string; c2: string; c3: string; c4: string;
  hi: string; paper: string; card: string; line: string;
  gry: string; lt: string; lhi: string; steel: string; side: string;
}

export interface Form {
  id: FormId;
  tag: string;
  name: { ko: string; en: string };
  /** Shown over the cover title. */
  kind: { ko: string; en: string };
  design: ThemeId;
  theme: BookTheme;
}

export function viewerTheme(t: Theme): BookTheme {
  const c = t.c, v = t.viewer;
  return {
    ink: "#" + v.board, dark2: c.ink, acc: v.acc,
    c1: v.mk1, c2: v.mk2, c3: t.series[2], c4: t.series[3],
    hi: c.accent, paper: c.paper, card: c.card, line: c.line,
    gry: c.mid, lt: c.card, lhi: c.card, steel: c.soft, side: c.hi,
  };
}

const form = (id: FormId, tag: string, name: Form["name"], kind: Form["kind"], design: ThemeId): Form =>
  ({ id, tag, name, kind, design, theme: viewerTheme(THEMES[design]) });

export const FORMS: Form[] = [
  form("report", "REPORT", { ko: "보고서", en: "Report" }, { ko: "사업 보고서", en: "Business report" }, "warm"),
  form("proposal", "PROPOSAL", { ko: "제안서", en: "Proposal" }, { ko: "제안서", en: "Proposal" }, "technical"),
  form("marketing", "PROFILE", { ko: "회사소개", en: "Company profile" }, { ko: "회사 소개", en: "Company profile" }, "editorial"),
  form("planning", "ADVISORY", { ko: "상담 리포트", en: "Advisory" }, { ko: "분석 리포트", en: "Advisory report" }, "advisor"),
];

export const formById = (id: string) => FORMS.find((f) => f.id === id) ?? FORMS[0];

/** Brand kit: the customer's accent replaces the viewer's button and mark color. */
export function withAccent(t: BookTheme, accent?: string): BookTheme {
  if (!accent || !/^#[0-9a-f]{6}$/i.test(accent)) return t;
  return { ...t, acc: accent, c1: accent, side: accent };
}
