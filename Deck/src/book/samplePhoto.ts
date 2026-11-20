import { useEffect, useState } from "react";

/** File or image -> data URL. */
export const readUrl = (f: Blob) =>
  new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

/** The sample book's cover photo (Unsplash, from the Pagecraft report sample). undefined while loading. */
export function useSamplePhoto() {
  const [photo, setPhoto] = useState<string | undefined>();
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}sample/cover.jpg`).then((r) => r.blob()).then(readUrl).then(setPhoto).catch(() => setPhoto(""));
  }, []);
  return photo;
}
