import type { BookData } from "./book/toBook";

export function slug(s: string) {
  return (s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "") || "deck").slice(0, 60);
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const bytes = (d: string) => Uint8Array.from(atob(d.split(",")[1]), (c) => c.charCodeAt(0));

export async function exportPng(images: string[], title: string) {
  if (images.length === 1) return download(new Blob([bytes(images[0])], { type: "image/png" }), `${slug(title)}.png`);
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  images.forEach((d, i) => zip.file(`${String(i + 1).padStart(2, "0")}.png`, bytes(d)));
  download(await zip.generateAsync({ type: "blob" }), `${slug(title)}-png.zip`);
}

export async function exportPdf(images: string[], title: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1600, 900], hotfixes: ["px_scaling"] });
  images.forEach((d, i) => {
    if (i > 0) pdf.addPage([1600, 900], "landscape");
    pdf.addImage(d, "JPEG", 0, 0, 1600, 900, undefined, "FAST");
  });
  pdf.setProperties({ title });
  download(pdf.output("blob"), `${slug(title)}.pdf`);
}

/** The 3D book as one HTML file: the same engine with the deck data built in. Needs internet for three.js and fonts. */
export async function exportFlipbook(book: BookData, title: string) {
  const res = await fetch(`${import.meta.env.BASE_URL}viewer.html`);
  const html = await res.text();
  const data = JSON.stringify({ D: book.D, CFG: { ...book.CFG, origFile: undefined, page: 0 } }).replace(/</g, "\\u003c");
  // The desk photo goes inside the file, so the book needs nothing next to it.
  const desk = await fetch(`${import.meta.env.BASE_URL}desk.jpg`).then((r) => r.blob()).then(
    (b) => new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(b); }),
  );
  const out = html.replace("url(desk.jpg)", `url(${desk})`).replace("<body>", `<body>\n<script>window.__BOOK=${data};</script>`);
  download(new Blob([out], { type: "text/html" }), `${slug(title)}-3d-book.html`);
}
