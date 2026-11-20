import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { BookData } from "./toBook";

export interface BookHandle {
  /** Final-state image of every page, drawn by the book engine (1600×900). */
  render(format?: "jpeg" | "png", quality?: number): Promise<string[]>;
  go(page: number): void;
  /** Opens the summary video. */
  video(): void;
}

interface Props {
  book: BookData;
  title: string;
  onPage?: (page: number) => void;
  onReady?: (pages: number) => void;
  onVideo?: (blob: Blob) => void;
  className?: string;
  /** Extra viewer settings (e.g. shift: the book sits right of center; brand: false hides the top-left line). */
  cfg?: Record<string, unknown>;
}

let seq = 0;

/**
 * Hosts public/viewer.html (the Pagecraft 3D book engine) and feeds it the deck data.
 * The engine builds once per load, so a changed deck reloads the frame on the same page.
 */
export const BookFrame = forwardRef<BookHandle, Props>(function BookFrame({ book, title, onPage, onReady, onVideo, className, cfg }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [version, setVersion] = useState(0);
  const latest = useRef(book);
  const page = useRef(0);
  const pending = useRef(new Map<number, (imgs: string[]) => void>());
  const cbs = useRef({ onPage, onReady, onVideo });
  cbs.current = { onPage, onReady, onVideo };
  const extra = useRef(cfg);
  extra.current = cfg;

  // Reload when the deck changes (debounced so typing doesn't thrash the 3D scene).
  useEffect(() => {
    latest.current = book;
    const id = setTimeout(() => setVersion((v) => v + 1), 450);
    return () => clearTimeout(id);
  }, [book]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const win = frame.current?.contentWindow;
      if (!win || e.source !== win || !e.data) return;
      const m = e.data;
      if (m.type === "viewer-loaded") {
        const b = latest.current;
        win.postMessage({ type: "book", D: b.D, CFG: { ...b.CFG, ...extra.current, page: page.current } }, "*");
      } else if (m.type === "ready") cbs.current.onReady?.(m.pages);
      else if (m.type === "page") {
        page.current = m.page;
        cbs.current.onPage?.(m.page);
      } else if (m.type === "rendered") {
        pending.current.get(m.id)?.(m.images);
        pending.current.delete(m.id);
      } else if (m.type === "video") cbs.current.onVideo?.(m.blob);
    };
    addEventListener("message", onMsg);
    return () => removeEventListener("message", onMsg);
  }, []);

  useImperativeHandle(ref, () => ({
    render(format = "jpeg", quality = 0.9) {
      return new Promise((resolve, reject) => {
        const win = frame.current?.contentWindow;
        if (!win) return reject(new Error("Book is not loaded"));
        const id = ++seq;
        pending.current.set(id, resolve);
        win.postMessage({ type: "render", id, format, quality }, "*");
        setTimeout(() => {
          if (pending.current.has(id)) {
            pending.current.delete(id);
            reject(new Error("Book did not respond"));
          }
        }, 30000);
      });
    },
    video() {
      frame.current?.contentWindow?.postMessage({ type: "video" }, "*");
    },
    go(p: number) {
      page.current = p;
      frame.current?.contentWindow?.postMessage({ type: "go", page: p }, "*");
    },
  }));

  return (
    <iframe
      key={version}
      ref={frame}
      className={className}
      src={`${import.meta.env.BASE_URL}viewer.html`}
      title={title}
      allow="fullscreen; autoplay"
      allowFullScreen
    />
  );
});
