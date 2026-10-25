import { Film } from "lucide-react";
import type { User } from "@/modules/profile/types/user";
import { handleTabKeyDown } from "@/modules/shared/ui/tabKeyboard";

export type CommercialMediaTabKey = "Fotos" | "Vídeos";

interface CommercialMediaTabProps {
  user: User;
  photos: string[];
  videos: string[];
  activeTab: CommercialMediaTabKey;
  onTabChange: (tab: CommercialMediaTabKey) => void;
  onPhotoSelect: (index: number) => void;
}

export function CommercialMediaTab({ user, photos, videos, activeTab, onTabChange, onPhotoSelect }: CommercialMediaTabProps) {
  return (
    <section id="merchant-media" className="max-w-4xl scroll-mt-32">
      <div className="mb-5">
        <h2 className="text-xl font-bold">Mídias de {user.displayName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Fotos e vídeos compartilhados por este comércio.</p>
      </div>
      <div role="tablist" aria-label="Tipo de mídia" className="mb-5 flex gap-2 border-b border-border">
        {(["Fotos", "Vídeos"] as const).map((mediaTab, index) => (
          <button
            key={mediaTab}
            id={`commercial-media-tab-${index}`}
            aria-controls={`commercial-media-panel-${index}`}
            type="button"
            role="tab"
            aria-selected={activeTab === mediaTab}
            tabIndex={activeTab === mediaTab ? 0 : -1}
            onKeyDown={(event) => handleTabKeyDown(event, index, 2, (nextIndex) => onTabChange(nextIndex === 0 ? "Fotos" : "Vídeos"))}
            onClick={() => onTabChange(mediaTab)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${
              activeTab === mediaTab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {mediaTab} ({mediaTab === "Fotos" ? photos.length : videos.length})
          </button>
        ))}
      </div>

      <div id="commercial-media-panel-0" role="tabpanel" aria-labelledby="commercial-media-tab-0" hidden={activeTab !== "Fotos"} tabIndex={0}>
        {activeTab === "Fotos" && (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {photos.map((photo, index) => (
              <button
                type="button"
                key={photo}
                onClick={() => onPhotoSelect(index)}
                className="group relative h-36 overflow-hidden rounded-xl bg-muted md:h-52"
                aria-label={`Exibir foto ${index + 1}`}
              >
                <img src={photo} alt={`${user.displayName}, foto ${index + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div id="commercial-media-panel-1" role="tabpanel" aria-labelledby="commercial-media-tab-1" hidden={activeTab !== "Vídeos"} tabIndex={0}>
        {activeTab === "Vídeos" && (videos.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {videos.map((video) => <video key={video} src={video} controls playsInline className="aspect-video w-full rounded-xl bg-black" />)}
          </div>
        ) : (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-border px-5 text-center">
            <Film className="h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">Ainda não há vídeos</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Os vídeos deste comércio aparecerão aqui.</p>
          </div>
        ))}
      </div>
    </section>
  );
}
