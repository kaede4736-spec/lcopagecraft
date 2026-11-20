import { useEffect, useRef, useState } from "react";
import { BRAND, type Plan } from "../config";
import type { Deck } from "../types";
import { design } from "../design/fromSlides";
import { renderDesigned } from "../design/render";
import { THEMES, withBrand } from "../design/themes";
import { formById } from "./forms";
import { docLang, toBook, type BookData, type BookOptions } from "./toBook";

export type BookInput = Pick<Deck, "slides" | "form" | "brand" | "orig" | "source" | "contact" | "mode" | "origTitles" | "photo">;

function common(deck: BookInput, plan: Plan, extra: { chrome?: boolean }): BookOptions {
  return {
    form: deck.form,
    lang: docLang(deck.source),
    watermark: plan.watermark ? `Made with ${BRAND}` : undefined,
    logo: plan.brandKit ? deck.brand?.logo : undefined,
    accent: plan.brandKit ? deck.brand?.accent : undefined,
    orig: deck.orig,
    origText: deck.source,
    contact: deck.contact,
    videoSave: plan.videoSave,
    chrome: extra.chrome,
  };
}

/** Builds the book: source slides as they are ("original"), or pages in the Pagecraft design drawn as images. */
export async function buildBook(deck: BookInput, plan: Plan, extra: { chrome?: boolean } = {}): Promise<BookData> {
  const o = common(deck, plan, extra);
  if (deck.mode === "original" && deck.orig?.length) {
    return toBook(deck.slides, { ...o, pageImages: deck.orig, pageTitles: deck.origTitles });
  }
  const form = formById(deck.form);
  const theme = withBrand(THEMES[form.design], o.accent);
  const date = new Date().toLocaleDateString(o.lang === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "long" });
  const d = design(deck.slides, {
    lang: o.lang, kind: form.kind[o.lang], photo: deck.photo, logo: o.logo, contact: deck.contact, notice: o.watermark, date,
  });
  const images = await renderDesigned(d, theme);
  return toBook(deck.slides, {
    ...o, pageImages: images.map((p) => p.src), pageLayers: images.map((p) => (p.layer ? { layer: p.layer, anim: p.anim } : undefined)),
    pageTitles: d.titles, pageSlides: d.pageSlide, inner: theme.viewer.inner,
  });
}

/** The latest book for `deck`; while a new one is drawn the previous one stays on screen. */
export function useBook(deck: BookInput, plan: Plan, extra: { chrome?: boolean } = {}) {
  const [book, setBook] = useState<BookData | null>(null);
  const [building, setBuilding] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);
  const key = JSON.stringify([deck.slides, deck.form, deck.brand, deck.contact, deck.mode, deck.photo?.length, deck.source.length, plan.id, extra.chrome]);
  useEffect(() => {
    const n = ++run.current;
    setBuilding(true);
    // A short pause lets typing settle before pages are redrawn.
    const id = setTimeout(() => {
      buildBook(deck, plan, extra)
        .then((b) => { if (n === run.current) { setBook(b); setError(null); } })
        .catch((e: Error) => { if (n === run.current) setError(e.message); })
        .finally(() => { if (n === run.current) setBuilding(false); });
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { book, building, error };
}
