import { useRef, useState } from "react";
import { Image, Video, Trash2 } from "lucide-react";
import type { PreparedMedia } from "@/modules/shared/media/mediaService";
import { MAX_MEDIA_ITEMS } from "@/modules/shared/media/hooks/useDraftMedia";
import { CameraCapture } from "./CameraCapture";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  initialType,
}: {
  count: number;
  onAdd: (files: FileList | File[] | null, type: "image" | "video") => void;
  disabled?: boolean;
  initialType?: "image" | "video";
}) {
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [capture, setCapture] = useState<"image" | "video" | null>(null);
  const full = count >= MAX_MEDIA_ITEMS || disabled;
  return (
    <div className="flex gap-4">
      <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple className="sr-only" tabIndex={-1} aria-label="Escolher fotos da galeria"
        onChange={(e) => { onAdd(e.currentTarget.files, "image"); e.currentTarget.value = ""; }} />
      <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" multiple className="sr-only" tabIndex={-1} aria-label="Escolher vídeos da galeria"
        onChange={(e) => { onAdd(e.currentTarget.files, "video"); e.currentTarget.value = ""; }} />
      {(["image", "video"] as const).map((type) => (
        <DropdownMenu key={type} defaultOpen={initialType === type}>
          <DropdownMenuTrigger asChild>
            <button type="button" disabled={full}
              className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-40"
              aria-label={type === "image" ? "Adicionar fotos" : "Adicionar vídeos"} data-testid={`button-add-${type}`}>
              {type === "image" ? <Image className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              {type === "image" ? "Fotos" : "Vídeos"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => (type === "image" ? imageRef : videoRef).current?.click()}>
              {type === "image" ? "Escolher foto da galeria" : "Escolher vídeo da galeria"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setCapture(type)}>
              {type === "image" ? "Tirar foto com a câmera" : "Gravar vídeo agora"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
      <CameraCapture type={capture} onClose={() => setCapture(null)} onCapture={(file, type) => onAdd([file], type)}
        onChooseFile={() => {
          const type = capture;
          setCapture(null);
          (type === "image" ? imageRef : videoRef).current?.click();
        }} />
    </div>
  );
}
