import { useEffect, useRef, useState } from "react";
import { mediaService, type PreparedMedia } from "@/services/mediaService";

export const MAX_MEDIA_ITEMS = 8;

/** Local-only media drafts (browser object URLs). Nothing is uploaded. */
export function useDraftMedia() {
  const [media, setMedia] = useState<PreparedMedia[]>([]);
  const [error, setError] = useState("");
  const mediaRef = useRef(media);
  mediaRef.current = media;
  const keepOnUnmount = useRef(false);

  useEffect(() => () => {
    if (!keepOnUnmount.current) mediaRef.current.forEach((m) => mediaService.release(m.url));
  }, []);

  async function add(fileList: FileList | null, type: "image" | "video") {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    const slots = Math.max(0, MAX_MEDIA_ITEMS - mediaRef.current.length);
    if (files.length > slots) {
      setError(`Você pode adicionar até ${MAX_MEDIA_ITEMS} mídias por publicação.`);
      return;
    }
    try {
      const prepared = await mediaService.prepareFiles(files, type);
      setMedia((current) => [...current, ...prepared]);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível preparar a mídia.");
    }
  }

  function remove(url: string) {
    mediaService.release(url);
    setMedia((current) => current.filter((m) => m.url !== url));
  }

  /** Call after a confirmed publish so the post keeps its object URLs. */
  function handOff() {
    keepOnUnmount.current = true;
  }

  return { media, error, add, remove, handOff };
}
