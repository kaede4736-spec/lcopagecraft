// Fonts for page images. A page is drawn as an SVG image, which cannot use the page's own web fonts,
// so the font files go inside it as data URLs. Both fonts ship in subsets by character range; only the
// subsets holding characters the book uses are embedded. Everything comes from this app: no font service sees the text.

import pretCss from "pretendard/dist/web/static/pretendard-dynamic-subset.css?raw";
import serif500 from "@fontsource/noto-serif-kr/500.css?raw";
import serif600 from "@fontsource/noto-serif-kr/600.css?raw";

const PRET = import.meta.glob("/node_modules/pretendard/dist/web/static/woff2-dynamic-subset/Pretendard-{Regular,Medium,SemiBold}.subset.*.woff2", {
  query: "?url", import: "default",
}) as Record<string, () => Promise<string>>;
const SERIF = import.meta.glob("/node_modules/@fontsource/noto-serif-kr/files/noto-serif-kr-*-{500,600}-normal.woff2", {
  query: "?url", import: "default",
}) as Record<string, () => Promise<string>>;

interface Face { family: string; weight: number; key: string; range: string; spans: [number, number][] }

function parse(cssText: string, dir: string, weights: number[], files: Record<string, () => Promise<string>>): Face[] {
  const out: Face[] = [];
  for (const m of cssText.matchAll(/@font-face\s*{([^}]*)}/g)) {
    const b = m[1];
    const family = /font-family:\s*'([^']+)'/.exec(b)?.[1];
    const weight = +(/font-weight:\s*(\d+)/.exec(b)?.[1] ?? 0);
    const file = /url\(\.\/(?:[\w-]+\/)?([^)]+?\.woff2)\)/.exec(b)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(b)?.[1]?.trim() ?? "";
    if (!family || !file || !weights.includes(weight)) continue;
    const key = `${dir}/${file}`;
    if (!files[key]) continue;
    const spans = range.split(",").map((r): [number, number] => {
      const [a, z] = r.trim().replace(/^U\+/i, "").split("-");
      return [parseInt(a, 16), parseInt(z ?? a, 16)];
    });
    out.push({ family, weight, key, range, spans });
  }
  return out;
}

let faces: { sans: Face[]; serif: Face[] } | null = null;
const getFaces = () =>
  (faces ??= {
    sans: parse(pretCss, "/node_modules/pretendard/dist/web/static/woff2-dynamic-subset", [400, 500, 600], PRET),
    serif: [
      ...parse(serif500, "/node_modules/@fontsource/noto-serif-kr/files", [500], SERIF),
      ...parse(serif600, "/node_modules/@fontsource/noto-serif-kr/files", [600], SERIF),
    ],
  });

const data = new Map<string, Promise<string>>();
async function dataUrl(key: string, files: Record<string, () => Promise<string>>) {
  if (!data.has(key)) {
    data.set(key, (async () => {
      const buf = new Uint8Array(await (await fetch(await files[key]())).arrayBuffer());
      let s = "";
      for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return `data:font/woff2;base64,${btoa(s)}`;
    })());
  }
  return data.get(key)!;
}

/** @font-face rules (with embedded files) covering every character in `text`. */
export async function fontCss(text: string, serif: boolean): Promise<string> {
  const cps = new Set<number>();
  for (const ch of text + " 0123456789·—–“”‘’%.,:;!?()[]/+-") cps.add(ch.codePointAt(0)!);
  const f = getFaces();
  const pick = (list: Face[]) => list.filter((x) => x.spans.some(([a, z]) => [...cps].some((c) => c >= a && c <= z)));
  const use = [...pick(f.sans).map((x) => ({ x, files: PRET })), ...(serif ? pick(f.serif).map((x) => ({ x, files: SERIF })) : [])];
  const rules = await Promise.all(
    use.map(async ({ x, files }) =>
      `@font-face{font-family:'${x.family}';font-weight:${x.weight};font-style:normal;src:url(${await dataUrl(x.key, files)}) format('woff2');unicode-range:${x.range}}`),
  );
  return rules.join("\n");
}
