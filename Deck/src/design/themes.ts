// The four LCO Pagecraft builder themes (pagecraft_builder/themes/themes.json), unchanged.

export type ThemeId = "technical" | "editorial" | "warm" | "advisor";

export interface ThemeColors {
  ink: string; paper: string; card: string; line: string; mid: string; soft: string;
  accent: string; accent_ink: string; hi: string; good: string; bad: string; cover: string;
}

export interface Theme {
  id: ThemeId;
  head: "sans" | "serif";
  c: ThemeColors;
  series: string[];
  /** 3D viewer chrome: button accent, logo marks, board and page-edge colors (hex without #). */
  viewer: { acc: string; mk1: string; mk2: string; board: string; inner: string };
}

export const THEMES: Record<ThemeId, Theme> = {
  technical: {
    id: "technical", head: "sans",
    c: { ink: "#14171B", paper: "#FFFFFF", card: "#F2F3F5", line: "#DADDE1", mid: "#69717D", soft: "#9AA1AB",
      accent: "#F5C400", accent_ink: "#14171B", hi: "#3D5A73", good: "#3D5A73", bad: "#C2412D", cover: "#111418" },
    series: ["#14171B", "#3D5A73", "#F5C400", "#9FB0BF", "#C2412D", "#69717D"],
    viewer: { acc: "#2B3038", mk1: "#F5C400", mk2: "#2B3038", board: "2b3038", inner: "e6e8eb" },
  },
  editorial: {
    id: "editorial", head: "serif",
    c: { ink: "#1C1B19", paper: "#F4F1EC", card: "#E9E3D9", line: "#D8D2C8", mid: "#6E6A63", soft: "#A39D93",
      accent: "#A9502C", accent_ink: "#FFFFFF", hi: "#A9502C", good: "#5E7A55", bad: "#A9502C", cover: "#1C1B19" },
    series: ["#1C1B19", "#A9502C", "#8A8377", "#C9A27E", "#5E7A55", "#6E6A63"],
    viewer: { acc: "#A9502C", mk1: "#A9502C", mk2: "#1C1B19", board: "3a332c", inner: "ece7df" },
  },
  warm: {
    id: "warm", head: "sans",
    c: { ink: "#2A1E17", paper: "#FBF8F3", card: "#F5EFE4", line: "#E3D9CB", mid: "#7A6C61", soft: "#A99C90",
      accent: "#D9772B", accent_ink: "#FFFFFF", hi: "#D9772B", good: "#6E8B5E", bad: "#B4472B", cover: "#2A1E17" },
    series: ["#2A1E17", "#D9772B", "#6E8B5E", "#CDBFAF", "#B4472B", "#7A6C61"],
    viewer: { acc: "#D9772B", mk1: "#D9772B", mk2: "#2A1E17", board: "2a1e17", inner: "efe7da" },
  },
  advisor: {
    id: "advisor", head: "serif",
    c: { ink: "#12324A", paper: "#F7F5F0", card: "#EFEBE3", line: "#DDD8CE", mid: "#66707A", soft: "#A3A9AF",
      accent: "#B88A44", accent_ink: "#FFFFFF", hi: "#B88A44", good: "#3F7D5C", bad: "#B5473A", cover: "#12324A" },
    series: ["#12324A", "#B88A44", "#3F7D5C", "#98A1AA", "#B5473A", "#2A4A63"],
    viewer: { acc: "#12324A", mk1: "#B88A44", mk2: "#12324A", board: "12324a", inner: "ece8df" },
  },
};

/** A brand accent replaces the theme's accent and highlight (the builder's "colors" override). */
export function withBrand(t: Theme, accent?: string): Theme {
  if (!accent || !/^#[0-9a-f]{6}$/i.test(accent)) return t;
  return { ...t, c: { ...t.c, accent, hi: accent }, viewer: { ...t.viewer, acc: accent, mk1: accent } };
}
