export type Layout = "title" | "section" | "bullets" | "stats" | "table" | "quote" | "closing";

export interface Stat {
  value: string;
  label: string;
}

export interface Slide {
  id: string;
  layout: Layout;
  title: string;
  kicker?: string;
  subtitle?: string;
  bullets?: string[];
  stats?: Stat[];
  table?: string[][];
  quote?: string;
  notes?: string;
  /** Came from a numbered list: shown as steps when short. */
  ordered?: boolean;
}

export interface BrandKit {
  logo?: string; // data URL
  accent?: string;
}

export interface Deck {
  id: string;
  title: string;
  form: import("./book/forms").FormId;
  slides: Slide[];
  source: string;
  createdAt: number;
  brand?: BrandKit;
  /** Original pages as images (from a PDF upload), shown in "Original". */
  orig?: string[];
  /** Page titles from the source file (contents list in "original pages" mode). */
  origTitles?: string[];
  /** "original": the book shows the source slides as they are. "rebuild": animated pages made from the text. */
  mode?: "original" | "rebuild";
  fileName?: string;
  contact?: string;
  /** Cover photo (data URL): from the uploaded file, or added in the editor. */
  photo?: string;
}

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "para"; text: string }
  | { type: "list"; items: string[]; ordered: boolean }
  | { type: "table"; rows: string[][] }
  | { type: "quote"; text: string };
