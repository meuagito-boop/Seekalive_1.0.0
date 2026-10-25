import { useEffect, useRef, useState } from "react";
import { MEDIA_LIMITS, mediaService, type PreparedMedia } from "@/modules/social/services/mediaService";

export const MAX_MEDIA_ITEMS = MEDIA_LIMITS.count;

/** Local-only media drafts (browser object URLs). Nothing is uploaded. */
export function useDraftMedia() {
  const [media, setMedia] = useState<PreparedMedia[]>([]);
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  const mediaRef = useRef(media);
  mediaRef.current = media;
  const keepOnUnmount = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (!keepOnUnmount.current) mediaRef.current.forEach((m) => mediaService.release(m.url));
    };
  }, []);

  async function add(fileList: FileList | File[] | null, type: "image" | "video") {
    const files = Array.from(fileList ?? []);
    if (!files.length || pending.current) return;
    const slots = Math.max(0, MAX_MEDIA_ITEMS - mediaRef.current.length);
    if (files.length > slots) {
      setError(`Você pode adicionar até ${MAX_MEDIA_ITEMS} mídias por publicação.`);
      return;
    }
    pending.current = true;
    setPreparing(true);
    try {
      const prepared = await mediaService.prepareFiles(files, type);
      if (!mounted.current) {
        prepared.forEach((m) => mediaService.release(m.url));
        return;
      }
      mediaRef.current = [...mediaRef.current, ...prepared];
      setMedia(mediaRef.current);
      setError("");
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "Não foi possível preparar a mídia.");
    } finally {
      pending.current = false;
      if (mounted.current) setPreparing(false);
    }
  }

  function remove(url: string) {
    mediaService.release(url);
    mediaRef.current = mediaRef.current.filter((m) => m.url !== url);
    setMedia(mediaRef.current);
  }

  /** Call after a confirmed publish so the post keeps its object URLs. */
  function handOff() {
    keepOnUnmount.current = true;
  }

  return { media, error, preparing, add, remove, handOff };
}
