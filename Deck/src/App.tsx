import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BRAND, PLANS, type ExportFormat, type Plan, type PlanId } from "./config";
import { STRINGS, detectLang, type Lang, type Strings } from "./i18n";
import type { Deck, Layout, Slide } from "./types";
import { parseDocument } from "./engine/parse";
import { buildSlides, newId } from "./engine/build";
import { countDeck, decksLeft, getPlan, loadDeck, saveDeck, setPlan } from "./store";
import { SAMPLE, SAMPLE_KO } from "./sample";
import { FORMS, formById, type FormId } from "./book/forms";
import { useBook } from "./book/useBook";
import { readUrl, useSamplePhoto } from "./book/samplePhoto";
import { BookFrame, type BookHandle } from "./book/BookFrame";
import { importFile, ImportError, type Imported } from "./import";
import { download, exportFlipbook, exportPdf, exportPng, slug } from "./exportBook";

const LAYOUTS: Layout[] = ["title", "section", "bullets", "stats", "table", "quote", "closing"];


export default function App() {
  const [lang, setLangState] = useState<Lang>(detectLang);
  const t = STRINGS[lang];
  const [plan, setPlanState] = useState(getPlan);
  const [deck, setDeck] = useState<Deck | null>(loadDeck);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => saveDeck(deck), [deck]);
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("deck.lang", lang);
    } catch {
      /* ignore */
    }
  }, [lang]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const changePlan = (id: PlanId) => {
    setPlan(id);
    const p = getPlan();
    setPlanState(p);
    if (deck && FORMS.findIndex((f) => f.id === deck.form) >= p.forms) setDeck({ ...deck, form: FORMS[0].id });
  };

  const generate = (src: Partial<Imported> & { text: string }, form: FormId): string | null => {
    const original = src.kind === "slides" && !!src.orig?.length;
    if (!src.text.trim() && !original) return t.emptyInput;
    if (decksLeft(plan) === 0) return t.limitReached;
    const text = src.text.trim() ? src.text : `# ${src.titles?.[0] ?? src.name ?? BRAND}`;
    const slides = buildSlides(parseDocument(text));
    countDeck(plan);
    setPlanState(getPlan());
    setDeck({
      id: newId(),
      title: slides[0]?.title ?? BRAND,
      form,
      slides,
      source: text,
      orig: src.orig,
      origTitles: src.titles,
      photo: src.photo,
      mode: original ? "original" : "rebuild",
      fileName: src.name,
      createdAt: Date.now(),
      brand: deck?.brand,
      contact: deck?.contact,
    });
    return null;
  };

  return (
    <div className="app">
      <header className="top">
        <button type="button" className="brand" onClick={() => setDeck(null)} aria-label={BRAND}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 5.5c3-1.5 6-1.5 9 0v14c-3-1.5-6-1.5-9 0z" fill="var(--blue)" />
            <path d="M21 5.5c-3-1.5-6-1.5-9 0v14c3-1.5 6-1.5 9 0z" fill="var(--orange)" />
          </svg>
          {BRAND}
          <span className="beta">beta</span>
        </button>
        <div className="top-right">
          <label className="plan-pick">
            <span>{t.testPlan}</span>
            <select id="plan" value={plan.id} onChange={(e) => changePlan(e.target.value as PlanId)}>
              {Object.values(PLANS).map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {p.priceLabel}</option>
              ))}
            </select>
          </label>
          <div className="seg" role="group" aria-label="Language">
            {(["en", "ko"] as Lang[]).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLangState(l)}>
                {l === "en" ? "EN" : "한국어"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {deck ? (
        <Editor deck={deck} setDeck={setDeck} plan={plan} t={t} lang={lang} onNew={() => setDeck(null)} setToast={setToast} />
      ) : (
        <Home t={t} lang={lang} plan={plan} onGenerate={generate} />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

/* ================= Home ================= */

function FormPicker({ value, onChange, plan, lang, t, compact }: {
  value: FormId; onChange: (f: FormId) => void; plan: Plan; lang: Lang; t: Strings; compact?: boolean;
}) {
  return (
    <div className={`forms${compact ? " compact" : ""}`} role="radiogroup" aria-label={t.form}>
      {FORMS.map((f, i) => {
        const locked = i >= plan.forms;
        const th = f.theme;
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={value === f.id}
            disabled={locked}
            title={locked ? t.locked : f.name[lang]}
            className="form-opt"
            onClick={() => onChange(f.id)}
          >
            <span className="swatches" aria-hidden="true">
              {[th.ink, th.c1, th.c2, th.c3, th.paper].map((c, k) => <i key={k} style={{ background: c }} />)}
            </span>
            <span className="form-name">{f.name[lang]}</span>
            {locked && !compact && <small>{t.locked}</small>}
          </button>
        );
      })}
    </div>
  );
}

function Home({ t, lang, plan, onGenerate }: {
  t: Strings; lang: Lang; plan: Plan;
  onGenerate: (src: Partial<Imported> & { text: string }, form: FormId) => string | null;
}) {
  const [file, setFile] = useState<Imported | null>(null);
  const [text, setText] = useState("");
  const [paste, setPaste] = useState(false);
  const [form, setForm] = useState<FormId>("proposal");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const left = decksLeft(plan);

  // The sample on the home screen is built by the same pipeline a user's file goes through.
  const photo = useSamplePhoto();
  const sampleIn = useMemo(() => {
    const src = lang === "ko" ? SAMPLE_KO : SAMPLE;
    return { slides: buildSlides(parseDocument(src)), form, source: src, photo };
  }, [lang, form, photo]);
  const { book: sample } = useBook(sampleIn, PLANS.pro);

  const take = async (f: File) => {
    setError(null);
    setBusy(true);
    try {
      setFile(await importFile(f));
      setPaste(false);
    } catch (e) {
      const code = e instanceof ImportError ? e.message : "";
      setError(code === "old-format" ? t.oldFormat : code === "no-text" ? t.noText : t.readFail(f.name));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    const src = file ?? { text };
    setError(onGenerate(src, form));
  };

  return (
    <main className="home">
      <section className="home-book" aria-label={t.sampleNote}>
        {sample ? <BookFrame book={sample} title={t.sampleNote} className="book-frame" /> : <div className="book-frame book-wait">{t.making}</div>}
        <p className="sample-note">{t.sampleNote}</p>
      </section>

      <section className="make">
        <p className="eyebrow">{t.formats}</p>
        <h1>{t.headline}</h1>
        <p className="lede">{t.lede}</p>

        {file ? (
          <div className="file-chip">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l5 5v15H6z" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M14 2v5h5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
            <span>
              <b>{file.name}</b>
              {file.orig?.length ? <small>{t.pagesFound(file.orig.length)}</small> : null}
            </span>
            <button type="button" className="link" onClick={() => setFile(null)}>{t.remove}</button>
          </div>
        ) : (
          <div
            className={`drop${over ? " over" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => input.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) take(f); }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7 9m5-5 5 5M4 15v4h16v-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <b>{busy ? t.reading : over ? t.dropActive : t.drop}</b>
            <small>{t.dropSub}</small>
            <input
              ref={input}
              id="file"
              type="file"
              hidden
              accept=".pptx,.pdf,.docx,.md,.markdown,.txt,.ppt,.doc"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) take(f); e.target.value = ""; }}
            />
          </div>
        )}

        {!file && (
          <button type="button" className="link paste-toggle" onClick={() => setPaste(!paste)}>
            {paste ? t.hidePaste : t.pasteToggle}
          </button>
        )}
        {paste && !file && (
          <textarea id="source" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.placeholder} spellCheck={false} />
        )}

        <div className="field-group">
          <span className="label">{t.form}</span>
          <FormPicker value={form} onChange={setForm} plan={plan} lang={lang} t={t} />
        </div>

        <button type="button" className="btn primary big" onClick={submit} disabled={busy}>{t.generate}</button>
        <p className="quota">{t.decksLeft(left, plan.period === "pass" ? t.onThisPass : t.thisMonth)} · {plan.name}</p>
        {error && <p className="error" role="alert">{error}</p>}

        <ul className="feats">
          {t.feats.map(([a, b]) => <li key={a}><b>{a}</b><span>{b}</span></li>)}
        </ul>
      </section>
    </main>
  );
}

/* ================= Editor ================= */

function Editor({ deck, setDeck, plan, t, lang, onNew, setToast }: {
  deck: Deck; setDeck: (d: Deck) => void; plan: Plan; t: Strings; lang: Lang;
  onNew: () => void; setToast: (s: string) => void;
}) {
  const bookRef = useRef<BookHandle>(null);
  const [page, setPage] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const { book, building } = useBook(deck, plan);
  const si = book ? book.pageSlide[Math.min(page, book.pageSlide.length - 1)] ?? 0 : 0;
  const slide: Slide | undefined = si >= 0 ? deck.slides[si] : undefined;
  const total = deck.slides.length;

  const onReady = useCallback(async () => {
    try {
      setThumbs(await bookRef.current!.render("jpeg", 0.5));
    } catch {
      /* thumbnails are optional */
    }
  }, []);

  const goPage = (p: number) => {
    setPage(p);
    bookRef.current?.go(p);
  };

  const updateSlide = (patch: Partial<Slide>) =>
    setDeck({ ...deck, slides: deck.slides.map((s, i) => (i === si ? { ...s, ...patch } : s)) });

  const move = (d: -1 | 1) => {
    const j = si + d;
    if (j < 0 || j >= total) return;
    const s = [...deck.slides];
    [s[si], s[j]] = [s[j], s[si]];
    setDeck({ ...deck, slides: s });
  };
  const remove = () => {
    if (total <= 1) return;
    setDeck({ ...deck, slides: deck.slides.filter((_, i) => i !== si) });
    setPage(Math.max(0, page - 1));
  };
  const duplicate = () => {
    const s = [...deck.slides];
    s.splice(si + 1, 0, { ...deck.slides[si], id: newId() });
    setDeck({ ...deck, slides: s });
  };
  const add = () => {
    const at = si >= 0 ? si + 1 : total;
    const s = [...deck.slides];
    s.splice(at, 0, { id: newId(), layout: "bullets", title: lang === "ko" ? "새 장" : "New page", bullets: [lang === "ko" ? "첫 번째 요점" : "First point"] });
    setDeck({ ...deck, slides: s });
  };

  const runExport = async (fmt: ExportFormat) => {
    setMenu(false);
    setBusy(t.exporting);
    try {
      if (!book) return;
      if (fmt === "flipbook") await exportFlipbook(book, deck.title);
      else {
        const imgs = await bookRef.current!.render(fmt === "png" ? "png" : "jpeg", 0.92);
        if (fmt === "png") await exportPng(imgs, deck.title);
        else await exportPdf(imgs, deck.title);
      }
      setToast(t.exported);
    } catch (e) {
      setToast(`Export failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const onLogo = async (f: File) => setDeck({ ...deck, brand: { ...deck.brand, logo: await readUrl(f) } });
  const onPhoto = async (f: File) => setDeck({ ...deck, photo: await readUrl(f) });

  const exportLabels: Record<ExportFormat, string> = { png: t.png, pdf: t.pdf, flipbook: t.flipbook };
  const form = formById(deck.form);

  return (
    <main className="editor">
      <div className="toolbar">
        <button type="button" className="btn ghost" onClick={onNew}>← {t.newBook}</button>
        <input id="deck-title" className="deck-title" value={deck.title} onChange={(e) => setDeck({ ...deck, title: e.target.value })} aria-label={t.title} />
        <span className="grow" />
        {!!deck.orig?.length && (
          <div className="seg mode" role="group" aria-label={t.pagesMode}>
            <button type="button" aria-pressed={deck.mode === "original"} onClick={() => { setDeck({ ...deck, mode: "original" }); setPage(0); }}>{t.modeOriginal}</button>
            <button type="button" aria-pressed={deck.mode !== "original"} onClick={() => { setDeck({ ...deck, mode: "rebuild" }); setPage(0); }}>{t.modeRebuild}</button>
          </div>
        )}
        <FormPicker value={deck.form} onChange={(f) => setDeck({ ...deck, form: f })} plan={plan} lang={lang} t={t} compact />
        <div className="menu-wrap">
          <button type="button" className="btn primary" onClick={() => setMenu(!menu)} aria-expanded={menu} disabled={!!busy}>
            {busy ?? t.export}
          </button>
          {menu && (
            <div className="menu" role="menu">
              {(["png", "pdf", "flipbook"] as ExportFormat[]).map((f) => {
                const ok = plan.exports.includes(f);
                return (
                  <button key={f} type="button" role="menuitem" disabled={!ok} onClick={() => runExport(f)}>
                    {exportLabels[f]}
                    {!ok && <small>{t.locked}</small>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="panes">
        <nav className="thumbs" aria-label={t.pages}>
          {(book?.D.titles ?? []).map((title, i) => (
            <button key={i} type="button" className={`thumb${i === page ? " on" : ""}`} onClick={() => goPage(i)} aria-current={i === page}>
              <span className="tn">{i + 1}</span>
              {thumbs[i] ? <img src={thumbs[i]} alt="" /> : <span className="tph" style={{ background: form.theme.paper }} />}
              <span className="tt">{title}</span>
            </button>
          ))}
          <button type="button" className="btn ghost add" onClick={add}>+ {t.addSlide}</button>
        </nav>

        <section className="stage" aria-label="Preview">
          {building && <span className="building" role="status">{t.making}</span>}
          {book && <BookFrame
            ref={bookRef}
            book={book}
            title={deck.title}
            className="book-frame"
            onReady={onReady}
            onPage={setPage}
            onVideo={(b) => { download(b, `${slug(deck.title)}.webm`); setToast(t.videoSaved); }}
          />}
        </section>

        <aside className="inspector">
          {slide ? (
            <>
              <Field label={t.layout}>
                <select id="layout" value={slide.layout} onChange={(e) => updateSlide({ layout: e.target.value as Layout })}>
                  {LAYOUTS.map((l) => <option key={l} value={l}>{t.layouts[l]}</option>)}
                </select>
              </Field>
              {slide.layout === "section" && (
                <Field label={t.kicker}>
                  <input id="kicker" value={slide.kicker ?? ""} onChange={(e) => updateSlide({ kicker: e.target.value })} />
                </Field>
              )}
              <Field label={t.title}>
                <textarea id="s-title" rows={2} value={slide.title} onChange={(e) => updateSlide({ title: e.target.value })} />
              </Field>
              {slide.layout === "title" && (
                <>
                  <Field label={t.subtitle}>
                    <textarea id="s-sub" rows={3} value={slide.subtitle ?? ""} onChange={(e) => updateSlide({ subtitle: e.target.value })} />
                  </Field>
                  {deck.mode !== "original" && (
                    <Field label={t.coverPhoto}>
                      {deck.photo && <img className="photo-pv" src={deck.photo} alt="" />}
                      <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
                      {deck.photo && <button type="button" className="btn ghost sm" onClick={() => setDeck({ ...deck, photo: undefined })}>{t.removePhoto}</button>}
                    </Field>
                  )}
                </>
              )}
              {(slide.layout === "bullets" || slide.layout === "closing") && (
                <Field label={t.bullets}>
                  <textarea id="s-bullets" rows={8} value={(slide.bullets ?? []).join("\n")} onChange={(e) => updateSlide({ bullets: e.target.value.split("\n") })} />
                </Field>
              )}
              {slide.layout === "stats" && (
                <Field label={t.stats}>
                  <textarea id="s-stats" rows={6} value={(slide.stats ?? []).map((s) => `${s.value} | ${s.label}`).join("\n")}
                    onChange={(e) => updateSlide({
                      stats: e.target.value.split("\n").map((l) => {
                        const [value, ...rest] = l.split("|");
                        return { value: value.trim(), label: rest.join("|").trim() };
                      }),
                    })} />
                </Field>
              )}
              {slide.layout === "table" && (
                <Field label={t.table}>
                  <textarea id="s-table" rows={8} className="mono" value={(slide.table ?? []).map((r) => r.join(" | ")).join("\n")}
                    onChange={(e) => updateSlide({ table: e.target.value.split("\n").map((l) => l.split("|").map((c) => c.trim())) })} />
                </Field>
              )}
              {slide.layout === "quote" && (
                <Field label={t.quote}>
                  <textarea id="s-quote" rows={5} value={slide.quote ?? ""} onChange={(e) => updateSlide({ quote: e.target.value })} />
                </Field>
              )}
              <div className="row-btns">
                <button type="button" className="btn ghost sm" onClick={() => move(-1)} disabled={si === 0}>↑ {t.moveUp}</button>
                <button type="button" className="btn ghost sm" onClick={() => move(1)} disabled={si === total - 1}>↓ {t.moveDown}</button>
                <button type="button" className="btn ghost sm" onClick={duplicate}>{t.duplicate}</button>
                <button type="button" className="btn ghost sm danger" onClick={remove} disabled={total <= 1}>{t.delete}</button>
              </div>
            </>
          ) : si === -2 ? (
            <p className="muted">{t.originalNote}</p>
          ) : (
            <>
              <p className="muted">{t.closePage}</p>
              <Field label={t.contact}>
                <input id="contact" value={deck.contact ?? ""} onChange={(e) => setDeck({ ...deck, contact: e.target.value })} placeholder="hello@company.com" />
              </Field>
            </>
          )}

          <fieldset className="brandkit" disabled={!plan.brandKit}>
            <legend>{t.brand}{!plan.brandKit && <small> · {t.locked}</small>}</legend>
            <Field label={t.accent}>
              <input id="accent" type="color" value={deck.brand?.accent || form.theme.acc}
                onChange={(e) => setDeck({ ...deck, brand: { ...deck.brand, accent: e.target.value } })} />
            </Field>
            <Field label={t.logo}>
              <input id="logo" type="file" accept="image/png,image/svg+xml,image/jpeg" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
            </Field>
            {deck.brand?.logo && (
              <button type="button" className="btn ghost sm" onClick={() => setDeck({ ...deck, brand: { ...deck.brand, logo: undefined } })}>{t.removeLogo}</button>
            )}
          </fieldset>
        </aside>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
