// Designed pages -> page images (cached by page HTML, so editing one page redraws only that page).

import { fontCss } from "./fonts";
import type { Designed } from "./fromSlides";
import { css, pageHtml } from "./pages";
import { BASE_CSS, LAYER_CSS, measureAnim, rasterize, type AnimRect } from "./raster";
import type { Theme } from "./themes";

const cache = new Map<string, Promise<unknown>>();

const textOf = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');

export interface PageImage {
  src: string;
  /** Chart pages: the data marks on a transparent layer, and where to wipe them in. */
  layer?: string;
  anim?: AnimRect[];
}

function once<T>(key: string, make: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    if (cache.size > 160) cache.clear();
    cache.set(key, make());
  }
  return cache.get(key) as Promise<T>;
}

export async function renderDesigned(d: Designed, th: Theme): Promise<PageImage[]> {
  const n = d.pages.length;
  const htmls = d.pages.map((p, i) => pageHtml(d.doc, p, th, i + 1, n));
  const fonts = await fontCss(htmls.map(textOf).join(" "), th.head === "serif");
  const styles = `${fonts}\n${css(th)}`;
  return Promise.all(
    htmls.map((h) => {
      // The font set depends on all pages, so it is part of the key.
      const key = th.id + "|" + JSON.stringify(th.c) + "|" + fonts.length + "|" + h;
      return once(key, async (): Promise<PageImage> => {
        if (!h.includes('class="anim"')) return { src: await rasterize(h, styles) };
        const [src, layer, anim] = await Promise.all([
          rasterize(h, styles + BASE_CSS),
          rasterize(h, styles + LAYER_CSS, "image/png"),
          measureAnim(h, styles),
        ]);
        return { src, layer, anim };
      });
    }),
  );
}
