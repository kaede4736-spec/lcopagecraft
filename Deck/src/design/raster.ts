// HTML page -> image, in the browser: the page goes into an SVG <foreignObject> with its CSS and fonts,
// and the SVG is drawn onto a 1600x900 canvas.

import { H, W } from "./pages";

const toXhtml = (html: string) => {
  const host = document.implementation.createHTMLDocument("").createElement("div");
  host.innerHTML = html;
  return Array.from(host.childNodes).map((n) => new XMLSerializer().serializeToString(n)).join("");
};

function load(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("page image failed"));
    im.src = src;
  });
}

export async function rasterize(html: string, styles: string, type = "image/jpeg", quality = 0.9): Promise<string> {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject x="0" y="0" width="${W}" height="${H}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;height:${H}px"><style>${styles.replace(/<\//g, "<\\/")}</style>${toXhtml(html)}</div>` +
    `</foreignObject></svg>`;
  // A data URL, not a blob URL: Chrome marks a canvas tainted after drawing a blob SVG with foreignObject.
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  {
    const im = await load(url);
    try { await im.decode(); } catch { /* drawn anyway */ }
    // Embedded fonts can finish a moment after the image reports loaded; draw once fonts settle.
    await new Promise((r) => setTimeout(r, 60));
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.drawImage(im, 0, 0, W, H);
    return c.toDataURL(type, quality);
  }
}

export interface AnimRect { x: number; y: number; w: number; h: number; dir: string; d: number }

/** Where each animated chart sits on the page (page pixels), measured by laying the page out in a hidden frame. */
export async function measureAnim(html: string, styles: string): Promise<AnimRect[]> {
  const f = document.createElement("iframe");
  f.setAttribute("aria-hidden", "true");
  f.style.cssText = `position:fixed;left:-20000px;top:0;width:${W}px;height:${H}px;border:0;visibility:hidden`;
  document.body.appendChild(f);
  try {
    const doc = f.contentDocument!;
    doc.open();
    doc.write(`<!doctype html><html><head><style>html,body{margin:0}${styles}</style></head><body>${html}</body></html>`);
    doc.close();
    try { await doc.fonts.ready; } catch { /* layout without fonts is close enough */ }
    const pg = doc.querySelector("section.pg");
    if (!pg) return [];
    const o = pg.getBoundingClientRect();
    return Array.from(pg.querySelectorAll<SVGElement | HTMLElement>(".anim"))
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { x: Math.round(r.left - o.left), y: Math.round(r.top - o.top), w: Math.round(r.width), h: Math.round(r.height), dir: e.dataset.dir || "right", d: +(e.dataset.delay || 0) };
      })
      .filter((r) => r.w > 2 && r.h > 2);
  } finally {
    f.remove();
  }
}

/** Page without its data marks, and the data marks alone on a transparent layer (as the builder does). */
export const BASE_CSS = "svg.anim .dm{visibility:hidden}";
export const LAYER_CSS = "section.pg,section.pg *{visibility:hidden}section.pg{background:transparent!important}svg.anim .dm{visibility:visible}";
