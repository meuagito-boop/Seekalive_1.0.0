import { useRef } from "react";
import { Image, Video, Trash2 } from "lucide-react";
import type { PreparedMedia } from "@/services/mediaService";
import { MAX_MEDIA_ITEMS } from "@/hooks/use-draft-media";

export function MediaDraftGrid({ media, onRemove }: { media: PreparedMedia[]; onRemove: (url: string) => void }) {
  if (!media.length) return null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {media.map((m) => (
        <div key={m.url} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
          {m.type === "image"
            ? <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
            : <video src={m.url} controls playsInline className="h-full w-full object-cover" aria-label={m.name} />}
          <button
            type="button"
            onClick={() => onRemove(m.url)}
            aria-label={`Remover ${m.name}`}
            className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white hover:bg-black"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function MediaPickerButtons({
  count,
  onAdd,
  disabled,
}: {
  count: number;
  onAdd: (files: FileList | null, type: "image" | "video") => void;
  disabled?: boolean;
}) {
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const full = count >= MAX_MEDIA_ITEMS || disabled;
  return (
    <div className="flex gap-4">
      <input ref={imageRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1}
        onChange={(e) => { onAdd(e.currentTarget.files, "image"); e.currentTarget.value = ""; }} />
      <input ref={videoRef} type="file" accept="video/*" multiple className="sr-only" tabIndex={-1}
        onChange={(e) => { onAdd(e.currentTarget.files, "video"); e.currentTarget.value = ""; }} />
      <button type="button" onClick={() => imageRef.current?.click()} disabled={full}
        className="text-primary transition-opacity hover:opacity-70 disabled:opacity-40"
        aria-label="Adicionar fotos" title="Adicionar fotos" data-testid="button-add-image">
        <Image className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => videoRef.current?.click()} disabled={full}
        className="text-primary transition-opacity hover:opacity-70 disabled:opacity-40"
        aria-label="Adicionar vídeos" title="Adicionar vídeos" data-testid="button-add-video">
        <Video className="h-5 w-5" />
      </button>
    </div>
  );
}
